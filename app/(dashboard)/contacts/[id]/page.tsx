"use client";

import { use, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactOverview } from "@/components/contact/contact-overview";
import { RecordActivityComposer } from "@/components/contact/record-activity-composer";
import type { EmailComposerSendPayload } from "@/components/email/email-composer";
import { useGmailStatus, useSendContactEmail } from "@/hooks/useGmail";
import { ActivityPanel } from "@/components/contact/activity-panel";
import { TasksPanel } from "@/components/contact/tasks-panel";
import { TaskDetailModal } from "@/components/contact/task-detail-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RecordSectionTabs } from "@/components/crm/record-section-tabs";
import { EntityRelatedPanel } from "@/components/crm/entity-related-panel";
import {
  useContact,
  useUpdateContact,
  useCreateContactNote,
  useContactTasks,
  useCreateContactTask,
  useDeleteContactTask,
  useContactActivityFeed,
} from "@/hooks/useContacts";
import type { ContactEmailMessage } from "@/hooks/useGmail";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useTickets, useCreateTicket } from "@/hooks/useTickets";
import { useDocuments, useUploadDocument } from "@/hooks/useDocuments";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useInvoices } from "@/hooks/useFinances";
import { contactToFormDefaults } from "@/lib/contact-payload";
import type { ContactFormInput, Task } from "@/types";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { QuickActionBar } from "@/components/quick-actions/quick-action-bar";
import { SendEmailModal } from "@/components/contact/send-email-modal";
import { RequestReviewModal } from "@/components/contact/request-review-modal";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { getInitials } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };
type WorkTab = "activity" | "related" | "tasks";
type MobileTab = "overview" | WorkTab;

export default function ContactDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [workTab, setWorkTab] = useState<WorkTab>("activity");
  const [mobileTab, setMobileTab] = useState<MobileTab>("overview");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<ContactEmailMessage | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const { canWrite } = useWorkspaceCapabilities();
  const { dict } = useCrmLocale();
  const c = dict.contacts;
  const act = dict.actions;

  const { data: contact, isLoading, error } = useContact(id);
  const updateContact = useUpdateContact(id);
  const { data: activityItems = [], isLoading: activityLoading } =
    useContactActivityFeed(id);
  const createNote = useCreateContactNote(id);
  const sendContactEmail = useSendContactEmail(id);
  const { data: gmailStatus } = useGmailStatus();
  const { data: tasks = [] } = useContactTasks(id);
  const createTask = useCreateContactTask(id);
  const deleteTask = useDeleteContactTask(id);
  const { data: contactOpportunities = [] } = useOpportunities(undefined, id);
  const { data: contactTickets = [] } = useTickets({ contact_id: id });
  const { data: contactQuotes = [] } = useDocuments({
    contact_id: id,
    kind: "quotes",
  });
  const { data: contactAttachments = [] } = useDocuments({
    contact_id: id,
    kind: "attachments",
  });
  const { data: contactEvents = [] } = useCalendarEvents({ contact_id: id });
  const { data: contactInvoices = [] } = useInvoices({ contact_id: id });
  const createTicket = useCreateTicket();
  const uploadDocument = useUploadDocument();

  function handleOpenTask(task: Task) {
    setOpenTask(task);
    setTaskModalOpen(true);
  }

  async function handleUpdate(data: ContactFormInput) {
    const { company_id: _omit, ...patch } = data;
    await updateContact.mutateAsync(patch);
    setIsEditing(false);
  }

  async function handleSaveField(patch: Partial<ContactFormInput>) {
    await updateContact.mutateAsync(patch);
  }

  if (isLoading) {
    return <p className="text-body-muted text-sm">{c.loading}</p>;
  }

  if (error || !contact) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--error)]">{c.notFound}</p>
        <Link href="/contacts" className="text-sm text-[var(--primary)] hover:underline">
              ← {dict.nav.contacts}
            </Link>
      </div>
    );
  }

  const initials = getInitials(contact.first_name, contact.last_name);
  const companyLabel = contact.company?.trim() || "—";

  const relatedCount =
    contactOpportunities.length +
    contactTickets.length +
    contactQuotes.length +
    contactInvoices.length +
    contactAttachments.length +
    contactEvents.length;

  const relatedPanel = (
    <EntityRelatedPanel
      showAccountContacts={false}
      context={{
        contactId: id,
        companyId: contact.company_id,
      }}
      opportunities={contactOpportunities}
      tickets={contactTickets}
      quotes={contactQuotes}
      invoices={contactInvoices}
      attachments={contactAttachments}
      calendarEvents={contactEvents}
      onCreateTicket={async (data) => {
        await createTicket.mutateAsync({
          ...data,
          contact_id: id,
          company_id: contact.company_id ?? data.company_id,
        });
      }}
      onCreateDocument={async (meta, file) => {
        await uploadDocument.mutateAsync({
          metadata: {
            ...meta,
            type: "attachment",
            contact_id: id,
            company_id: contact.company_id ?? meta.company_id,
          },
          file,
        });
      }}
      ticketLoading={createTicket.isPending}
      documentLoading={uploadDocument.isPending}
    />
  );

  const activityPanel = (
    <>
      <RecordActivityComposer
        contact={contact}
        companyName={companyLabel !== "—" ? companyLabel : null}
        canWrite={canWrite}
        gmailConnected={Boolean(gmailStatus?.connected)}
        isAdding={createNote.isPending || createTask.isPending}
        isSendingEmail={sendContactEmail.isPending}
        onLog={async (input) => {
          await createNote.mutateAsync({
            content: input.content,
            activity_type: input.activity_type,
          });
        }}
        onSendEmail={async (payload: EmailComposerSendPayload) => {
          await sendContactEmail.mutateAsync({
            to: payload.to,
            cc: payload.cc,
            bcc: payload.bcc,
            subject: payload.subject,
            body: payload.body,
            template_id: payload.template_id,
            skip_signature_append: payload.skip_signature_append,
            attachments: payload.attachments,
          });
        }}
        onAddTask={async (input) => {
          await createTask.mutateAsync({
            title: input.title,
            due_date: input.due_date ?? undefined,
          });
        }}
      />
      <ActivityPanel
        contactId={id}
        items={activityItems}
        isLoading={activityLoading}
        canWrite={canWrite}
        timelineOnly
      />
    </>
  );

  const tasksPanel = (
    <TasksPanel
      tasks={tasks}
      isAdding={createTask.isPending}
      canWrite={canWrite}
      onAdd={async (input) => {
        await createTask.mutateAsync(input);
      }}
      onOpenTask={handleOpenTask}
      onDeleteTask={canWrite ? setTaskToDelete : undefined}
    />
  );

  const workTabs = [
    { id: "activity" as const, label: c.logActivityTab, count: activityItems.length },
    { id: "related" as const, label: c.relatedTab, count: relatedCount },
    { id: "tasks" as const, label: c.tasksTab, count: tasks.length },
  ];

  const workPanelContent =
    workTab === "activity"
      ? activityPanel
      : workTab === "related"
        ? relatedPanel
        : tasksPanel;

  const mobileContent =
    mobileTab === "overview" ? (
      <ContactOverview contact={contact} onSaveField={handleSaveField} />
    ) : mobileTab === "activity" ? (
      activityPanel
    ) : mobileTab === "related" ? (
      relatedPanel
    ) : (
      tasksPanel
    );

  return (
    <div className="space-y-5 w-full max-w-[1600px]">
      <TaskDetailModal
        contactId={id}
        task={openTask}
        open={taskModalOpen}
        canWrite={canWrite}
        onClose={() => {
          setTaskModalOpen(false);
          setOpenTask(null);
        }}
        onUpdated={() => {
          void queryClient.invalidateQueries({ queryKey: ["contact-tasks", id] });
          void queryClient.invalidateQueries({ queryKey: ["contact-activity-feed", id] });
        }}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey: ["contact-tasks", id] });
          void queryClient.invalidateQueries({ queryKey: ["contact-activity-feed", id] });
        }}
      />

      <ConfirmDialog
        open={!!taskToDelete}
        title={dict.tasks.deleteTitle}
        description={dict.tasks.deleteDescription}
        confirmLabel={act.delete}
        cancelLabel={act.cancel}
        destructive
        loading={deleteTask.isPending}
        onCancel={() => setTaskToDelete(null)}
        onConfirm={async () => {
          if (!taskToDelete) return;
          await deleteTask.mutateAsync(taskToDelete.id);
          setTaskToDelete(null);
        }}
      />

      <SendEmailModal
        contact={contact}
        companyName={contact.company}
        open={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setReplyToEmail(null);
        }}
        replyTo={replyToEmail}
        onSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["contact-activity-feed", id] });
          void queryClient.invalidateQueries({ queryKey: ["contact-emails", id] });
        }}
      />

      <RequestReviewModal
        contact={contact}
        companyName={contact.company}
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["contact", id] });
          void queryClient.invalidateQueries({ queryKey: ["contact-activity-feed", id] });
        }}
      />

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href="/contacts"
              className="text-xs text-body-muted hover:text-[var(--primary)]"
            >
              {c.backToAll}
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-heading tracking-tight mt-0.5">
              {contact.first_name} {contact.last_name}
            </h1>
            <p className="text-sm text-body-muted mt-0.5 truncate">
              {contact.title && <span>{contact.title} · </span>}
              {companyLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="info">{contact.status}</Badge>
              {contact.email && (
                <Badge variant="neutral" className="max-w-[200px] truncate">
                  {contact.email}
                </Badge>
              )}
            </div>
            <QuickActionBar
              email={contact.email}
              phone={contact.phone}
              className="mt-3"
              onSendEmail={
                contact.email?.trim() && canWrite
                  ? () => setEmailModalOpen(true)
                  : undefined
              }
              onRequestReview={
                contact.email?.trim() &&
                canWrite &&
                !contact.review_request_opt_out
                  ? () => setReviewModalOpen(true)
                  : undefined
              }
              noteLoading={createNote.isPending}
              taskLoading={createTask.isPending}
              onAddNote={async (content) => {
                await createNote.mutateAsync({ content, activity_type: "note" });
              }}
              onAddTask={async (input) => {
                const task = await createTask.mutateAsync({
                  title: input.title,
                  due_at: input.due_at,
                  priority: input.priority,
                  assigned_to: input.assigned_to,
                });
                handleOpenTask(task);
              }}
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 self-start"
          onClick={() => setIsEditing((v) => !v)}
        >
          {isEditing ? act.cancel : act.edit}
        </Button>
      </header>

      {isEditing ? (
        <Card padding="lg">
          <ContactForm
            key={contact.id}
            defaultValues={contactToFormDefaults(contact)}
            onSubmit={handleUpdate}
            isLoading={updateContact.isPending}
            submitLabel={c.saveChanges}
          />
        </Card>
      ) : (
        <>
          <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
            <Card className="lg:col-span-5" padding="lg">
              <div className="flex items-center gap-2 mb-5">
                <User className="h-4 w-4 text-[var(--primary)]" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-heading">{c.contactDetails}</h2>
              </div>
              <ContactOverview contact={contact} onSaveField={handleSaveField} />
            </Card>

            <Card className="lg:col-span-7" padding="none">
              <div className="px-6 pt-4">
                <RecordSectionTabs
                  tabs={workTabs}
                  activeTab={workTab}
                  onTabChange={(t) => setWorkTab(t as WorkTab)}
                />
              </div>
              <div className="p-6 pt-4">{workPanelContent}</div>
            </Card>
          </div>

          <Card className="lg:hidden" padding="none">
            <div className="px-6 pt-4">
              <RecordSectionTabs
                tabs={[
                  { id: "overview", label: c.detailsTab },
                  ...workTabs,
                ]}
                activeTab={mobileTab}
                onTabChange={(t) => setMobileTab(t as MobileTab)}
              />
            </div>
            <div className="p-6 pt-4">{mobileContent}</div>
          </Card>
        </>
      )}
    </div>
  );
}
