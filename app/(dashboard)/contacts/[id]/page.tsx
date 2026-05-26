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
import { ActivityPanel } from "@/components/contact/activity-panel";
import { TasksPanel } from "@/components/contact/tasks-panel";
import { TaskDetailModal } from "@/components/contact/task-detail-modal";
import { RecordSectionTabs } from "@/components/crm/record-section-tabs";
import { EntityRelatedPanel } from "@/components/crm/entity-related-panel";
import {
  useContact,
  useUpdateContact,
  useCreateContactNote,
  useContactTasks,
  useCreateContactTask,
  useContactActivityFeed,
} from "@/hooks/useContacts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useTickets, useCreateTicket } from "@/hooks/useTickets";
import { useDocuments, useUploadDocument } from "@/hooks/useDocuments";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCompany } from "@/hooks/useCompanies";
import { contactToFormDefaults } from "@/lib/contact-payload";
import type { ContactFormInput, Task } from "@/types";
import { QuickActionBar } from "@/components/quick-actions/quick-action-bar";
import { SendEmailModal } from "@/components/contact/send-email-modal";
import { RequestReviewModal } from "@/components/contact/request-review-modal";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { ContactEmailPanel } from "@/components/contact/contact-email-panel";
import { useContactEmails } from "@/hooks/useGmail";
import { getInitials } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };
type WorkTab = "related" | "emails" | "activity" | "tasks";
type MobileTab = "overview" | WorkTab;

export default function ContactDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [workTab, setWorkTab] = useState<WorkTab>("related");
  const [mobileTab, setMobileTab] = useState<MobileTab>("overview");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const { canWrite } = useWorkspaceCapabilities();

  const { data: contact, isLoading, error } = useContact(id);
  const updateContact = useUpdateContact(id);
  const { data: activityItems = [], isLoading: activityLoading } =
    useContactActivityFeed(id);
  const { data: contactEmails = [] } = useContactEmails(id);
  const createNote = useCreateContactNote(id);
  const { data: tasks = [] } = useContactTasks(id);
  const createTask = useCreateContactTask(id);
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
  const createTicket = useCreateTicket();
  const uploadDocument = useUploadDocument();
  const { data: linkedAccount } = useCompany(contact?.company_id ?? "");

  const relatedCount =
    contactOpportunities.length +
    contactTickets.length +
    contactQuotes.length +
    contactAttachments.length;

  function handleOpenTask(task: Task) {
    setOpenTask(task);
    setTaskModalOpen(true);
  }

  async function handleUpdate(data: ContactFormInput) {
    await updateContact.mutateAsync(data);
    setIsEditing(false);
  }

  async function handleSaveField(patch: Partial<ContactFormInput>) {
    await updateContact.mutateAsync(patch);
  }

  if (isLoading) {
    return <p className="text-body-muted text-sm">Loading contact…</p>;
  }

  if (error || !contact) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--error)]">Contact not found.</p>
        <Link href="/contacts" className="text-sm text-[var(--primary)] hover:underline">
          ← Back to contacts
        </Link>
      </div>
    );
  }

  const initials = getInitials(contact.first_name, contact.last_name);

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
    <ActivityPanel
      items={activityItems}
      isLoading={activityLoading}
      isAdding={createNote.isPending}
      onAdd={async (input) => {
        await createNote.mutateAsync(input);
      }}
    />
  );

  const tasksPanel = (
    <TasksPanel
      tasks={tasks}
      isAdding={createTask.isPending}
      onAdd={async (input) => createTask.mutateAsync(input)}
      onOpenTask={handleOpenTask}
    />
  );

  const emailsPanel = (
    <ContactEmailPanel
      contact={contact}
      onOpenFullCompose={() => setEmailModalOpen(true)}
    />
  );

  const workPanelContent =
    workTab === "related"
      ? relatedPanel
      : workTab === "emails"
        ? emailsPanel
        : workTab === "activity"
          ? activityPanel
          : tasksPanel;

  const mobileContent =
    mobileTab === "overview" ? (
      <ContactOverview contact={contact} onSaveField={handleSaveField} />
    ) : mobileTab === "related" ? (
      relatedPanel
    ) : mobileTab === "emails" ? (
      emailsPanel
    ) : mobileTab === "activity" ? (
      activityPanel
    ) : (
      tasksPanel
    );

  return (
    <div className="space-y-6 w-full">
      <TaskDetailModal
        contactId={id}
        task={openTask}
        open={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setOpenTask(null);
        }}
        onUpdated={() => {
          void queryClient.invalidateQueries({ queryKey: ["contact-tasks", id] });
          void queryClient.invalidateQueries({ queryKey: ["contact-activity-feed", id] });
        }}
      />

      <SendEmailModal
        contact={contact}
        companyName={linkedAccount?.name}
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["contact-activity-feed", id] });
          void queryClient.invalidateQueries({ queryKey: ["contact-emails", id] });
        }}
      />

      <RequestReviewModal
        contact={contact}
        companyName={linkedAccount?.name}
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["contact", id] });
          void queryClient.invalidateQueries({ queryKey: ["contact-activity-feed", id] });
        }}
      />

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <Link
              href="/contacts"
              className="text-xs text-body-muted hover:text-[var(--primary)]"
            >
              ← All contacts
            </Link>
            <h1 className="text-2xl font-bold text-heading tracking-tight mt-0.5">
              {contact.first_name} {contact.last_name}
            </h1>
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
            <p className="text-sm text-body-muted mt-3">
              {contact.title && <span>{contact.title} · </span>}
              {contact.company_id && linkedAccount ? (
                <Link
                  href={`/accounts/${contact.company_id}`}
                  className="text-[var(--secondary)] hover:underline"
                >
                  {linkedAccount.name}
                </Link>
              ) : (
                contact.company || "No account"
              )}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="info">{contact.status}</Badge>
              {contact.email && <Badge variant="neutral">{contact.email}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setIsEditing((v) => !v)}>
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      {isEditing ? (
        <Card padding="lg">
          <ContactForm
            key={contact.id}
            defaultValues={contactToFormDefaults(contact)}
            onSubmit={handleUpdate}
            isLoading={updateContact.isPending}
            submitLabel="Save Changes"
          />
        </Card>
      ) : (
        <>
          <div className="hidden xl:grid xl:grid-cols-12 gap-6 items-start">
            <Card className="xl:col-span-5" padding="lg">
              <div className="flex items-center gap-2 mb-5">
                <User className="h-4 w-4 text-[var(--primary)]" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-heading">Overview</h2>
              </div>
              <ContactOverview contact={contact} onSaveField={handleSaveField} />
            </Card>
            <Card className="xl:col-span-7" padding="none">
              <div className="px-6 pt-4">
                <RecordSectionTabs
                  tabs={[
                    { id: "related", label: "Related", count: relatedCount },
                    { id: "emails", label: "Emails", count: contactEmails.length },
                    { id: "activity", label: "Activity", count: activityItems.length },
                    { id: "tasks", label: "Tasks", count: tasks.length },
                  ]}
                  activeTab={workTab}
                  onTabChange={(t) => setWorkTab(t as WorkTab)}
                />
              </div>
              <div className="p-6">{workPanelContent}</div>
            </Card>
          </div>

          <Card className="xl:hidden" padding="none">
            <div className="px-6 pt-4">
              <RecordSectionTabs
                tabs={[
                  { id: "overview", label: "Overview" },
                  { id: "related", label: "Related", count: relatedCount },
                  { id: "emails", label: "Emails", count: contactEmails.length },
                  { id: "activity", label: "Activity", count: activityItems.length },
                  { id: "tasks", label: "Tasks", count: tasks.length },
                ]}
                activeTab={mobileTab}
                onTabChange={(t) => setMobileTab(t as MobileTab)}
              />
            </div>
            <div className="p-6">{mobileContent}</div>
          </Card>
        </>
      )}
    </div>
  );
}
