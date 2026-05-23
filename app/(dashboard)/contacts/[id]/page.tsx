"use client";

import { use, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactOverview } from "@/components/contact/contact-overview";
import { ActivityPanel } from "@/components/contact/activity-panel";
import { TasksPanel } from "@/components/contact/tasks-panel";
import { RecordSectionTabs } from "@/components/crm/record-section-tabs";
import { EntityRelatedPanel } from "@/components/crm/entity-related-panel";
import {
  useContact,
  useUpdateContact,
  useContactNotes,
  useCreateContactNote,
  useContactTasks,
  useCreateContactTask,
} from "@/hooks/useContacts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useTickets, useCreateTicket } from "@/hooks/useTickets";
import { useDocuments, useUploadDocument } from "@/hooks/useDocuments";
import { useCalendarEvents } from "@/hooks/useCalendar";
import { useCompany } from "@/hooks/useCompanies";
import { contactToFormDefaults } from "@/lib/contact-payload";
import type { ContactFormInput } from "@/types";
import { getInitials } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };
type WorkTab = "related" | "activity" | "tasks";
type MobileTab = "overview" | WorkTab;

export default function ContactDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [isEditing, setIsEditing] = useState(false);
  const [workTab, setWorkTab] = useState<WorkTab>("related");
  const [mobileTab, setMobileTab] = useState<MobileTab>("overview");

  const { data: contact, isLoading, error } = useContact(id);
  const updateContact = useUpdateContact(id);
  const { data: notes = [] } = useContactNotes(id);
  const createNote = useCreateContactNote(id);
  const { data: tasks = [] } = useContactTasks(id);
  const createTask = useCreateContactTask(id);
  const { data: contactOpportunities = [] } = useOpportunities(undefined, id);
  const { data: contactTickets = [] } = useTickets({ contact_id: id });
  const { data: contactDocuments = [] } = useDocuments({ contact_id: id });
  const { data: contactEvents = [] } = useCalendarEvents({ contact_id: id });
  const createTicket = useCreateTicket();
  const uploadDocument = useUploadDocument();
  const { data: linkedAccount } = useCompany(contact?.company_id ?? "");

  const relatedCount =
    contactOpportunities.length + contactTickets.length + contactDocuments.length;

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
      documents={contactDocuments}
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

  const workPanelContent =
    workTab === "related" ? (
      relatedPanel
    ) : workTab === "activity" ? (
      <ActivityPanel
        notes={notes}
        isAdding={createNote.isPending}
        onAdd={async (input) => {
          await createNote.mutateAsync(input);
        }}
      />
    ) : (
      <TasksPanel
        tasks={tasks}
        isAdding={createTask.isPending}
        onAdd={async (input) => {
          await createTask.mutateAsync(input);
        }}
      />
    );

  const mobileContent =
    mobileTab === "overview" ? (
      <ContactOverview contact={contact} onSaveField={handleSaveField} />
    ) : mobileTab === "related" ? (
      relatedPanel
    ) : mobileTab === "activity" ? (
      <ActivityPanel
        notes={notes}
        isAdding={createNote.isPending}
        onAdd={async (input) => {
          await createNote.mutateAsync(input);
        }}
      />
    ) : (
      <TasksPanel
        tasks={tasks}
        isAdding={createTask.isPending}
        onAdd={async (input) => {
          await createTask.mutateAsync(input);
        }}
      />
    );

  return (
    <div className="space-y-6 w-full">
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
            <p className="text-sm text-body-muted mt-1">
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
                    { id: "activity", label: "Activity", count: notes.length },
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
                  { id: "activity", label: "Activity", count: notes.length },
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
