"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, Star, Ticket } from "lucide-react";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, ticketPriorityVariant, ticketStatusVariant } from "@/components/ui/badge";
import { ActivityPanel } from "@/components/contact/activity-panel";
import { ContactEmailPanel } from "@/components/contact/contact-email-panel";
import { SendEmailModal } from "@/components/contact/send-email-modal";
import { RequestReviewModal } from "@/components/contact/request-review-modal";
import { TicketForm } from "@/components/tickets/ticket-form";
import { TicketOverview } from "@/components/tickets/ticket-overview";
import { useTicket, useUpdateTicket } from "@/hooks/useTickets";
import { useTicketNotes, useCreateTicketNote } from "@/hooks/useTicketNotes";
import { useTicketEmails, type ContactEmailMessage } from "@/hooks/useGmail";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { formatServiceTicketLabel } from "@/lib/service-ticket-number";
import type { TicketFormInput } from "@/types";

type PageProps = { params: Promise<{ id: string }> };
type TicketTab = "details" | "emails" | "activity";

export default function ServiceTicketDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TicketTab>("details");
  const [editing, setEditing] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<ContactEmailMessage | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const { dict } = useCrmLocale();
  const r = dict.reviewRequest;

  const { data: ticket, isLoading, error } = useTicket(id);
  const updateTicket = useUpdateTicket(id);
  const { data: notes = [] } = useTicketNotes(id);
  const { data: ticketEmails = [] } = useTicketEmails(id);
  const createNote = useCreateTicketNote(id);
  const { canWrite } = useWorkspaceCapabilities();

  async function handleUpdate(data: TicketFormInput) {
    await updateTicket.mutateAsync(data);
    setEditing(false);
  }

  async function handleSaveField(patch: Partial<TicketFormInput>) {
    await updateTicket.mutateAsync(patch);
  }

  if (isLoading) {
    return <p className="text-body-muted text-sm">Loading service ticket…</p>;
  }

  if (error || !ticket) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--error)]">Service ticket not found.</p>
        <Link href="/tickets" className="text-sm text-[var(--primary)] hover:underline">
          ← Service tickets
        </Link>
      </div>
    );
  }

  const headerLabel = formatServiceTicketLabel(ticket.ticket_number);
  const displaySubject = ticket.subject?.trim() || ticket.title;
  const linkedContact = ticket.contact;
  const contactEmail = linkedContact?.email?.trim() ?? "";
  const isClosed = ticket.status === "closed";
  const canRequestReview =
    canWrite &&
    linkedContact &&
    contactEmail &&
    !linkedContact.review_request_opt_out;

  const detailsPanel = (
    <TicketOverview ticket={ticket} onSaveField={handleSaveField} readOnly={!canWrite} />
  );

  const emailsPanel = linkedContact ? (
    <ContactEmailPanel
      contact={{
        id: linkedContact.id,
        first_name: linkedContact.first_name,
        last_name: linkedContact.last_name,
        email: linkedContact.email ?? "",
      }}
      ticketId={id}
      onOpenCompose={
        canWrite && contactEmail
          ? (replyTo) => {
              setReplyToEmail(replyTo ?? null);
              setEmailModalOpen(true);
            }
          : undefined
      }
    />
  ) : (
    <p className="text-sm text-body-muted py-6 text-center">
      Link a contact to this ticket to send and sync email with the customer.
    </p>
  );

  const activityPanel = (
    <ActivityPanel notes={notes} />
  );

  const tabs = [
    { id: "details" as const, label: "Details" },
    { id: "emails" as const, label: "Emails", count: ticketEmails.length },
    { id: "activity" as const, label: "Activity", count: notes.length },
  ];

  return (
    <div className="space-y-6 w-full">
      {linkedContact && (
        <>
        <SendEmailModal
          contact={{
            id: linkedContact.id,
            first_name: linkedContact.first_name,
            last_name: linkedContact.last_name,
            email: linkedContact.email ?? "",
            company: ticket.company?.name ?? undefined,
            company_id: ticket.company_id ?? undefined,
          }}
          ticketId={id}
          companyName={ticket.company?.name}
          open={emailModalOpen}
          onClose={() => {
            setEmailModalOpen(false);
            setReplyToEmail(null);
          }}
          replyTo={replyToEmail}
          onSent={() => {
            void queryClient.invalidateQueries({ queryKey: ["ticket-emails", id] });
            void queryClient.invalidateQueries({ queryKey: ["ticket-notes", id] });
          }}
        />
        <RequestReviewModal
          contact={{
            id: linkedContact.id,
            first_name: linkedContact.first_name,
            last_name: linkedContact.last_name,
            email: linkedContact.email ?? "",
            company: ticket.company?.name ?? undefined,
            company_id: ticket.company_id ?? undefined,
            review_request_opt_out: linkedContact.review_request_opt_out,
          }}
          ticketId={id}
          companyName={ticket.company?.name}
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          onSent={() => {
            void queryClient.invalidateQueries({ queryKey: ["ticket", id] });
            void queryClient.invalidateQueries({ queryKey: ["ticket-notes", id] });
            if (linkedContact.id) {
              void queryClient.invalidateQueries({
                queryKey: ["contact", linkedContact.id],
              });
            }
          }}
        />
        </>
      )}

      {isClosed && canRequestReview && (
        <div className="rounded-lg border border-[var(--secondary)]/30 bg-[var(--secondary)]/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-heading">{r?.ticketPrompt}</p>
          <Button size="sm" onClick={() => setReviewModalOpen(true)}>
            <Star className="h-4 w-4 mr-1.5" />
            {r?.action}
          </Button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <Ticket className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <Link
              href="/tickets"
              className="text-xs text-body-muted hover:text-[var(--primary)]"
            >
              ← Service tickets
            </Link>
            <h1 className="text-2xl font-bold text-heading tracking-tight mt-0.5">
              {headerLabel}
            </h1>
            <p className="text-base text-heading font-medium mt-1">{displaySubject}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant={ticketStatusVariant(ticket.status)}>
                {ticket.status.replace("_", " ")}
              </Badge>
              <Badge variant={ticketPriorityVariant(ticket.priority)}>
                {ticket.priority} priority
              </Badge>
              {ticket.category && <Badge variant="neutral">{ticket.category}</Badge>}
            </div>
            {linkedContact && (
              <p className="text-sm text-body-muted mt-2">
                Contact:{" "}
                <Link
                  href={`/contacts/${linkedContact.id}`}
                  className="text-[var(--secondary)] hover:underline"
                >
                  {linkedContact.first_name} {linkedContact.last_name}
                </Link>
                {contactEmail && (
                  <span className="text-body-muted"> · {contactEmail}</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {canWrite && contactEmail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailModalOpen(true)}
            >
              <Mail className="h-4 w-4 mr-1.5" />
              Send email
            </Button>
          )}
          {canRequestReview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewModalOpen(true)}
            >
              <Star className="h-4 w-4 mr-1.5" />
              {r?.action}
            </Button>
          )}
          {canWrite && (
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <Card>
          <TicketForm
            initial={{
              id: ticket.id,
              contact_id: ticket.contact_id ?? undefined,
              company_id: ticket.company_id ?? undefined,
              subject: ticket.subject ?? ticket.title,
              title: ticket.title,
              description: ticket.description,
              status: ticket.status,
              priority: ticket.priority,
              category: ticket.category,
              tags: ticket.tags?.join(", ") ?? "",
              custom_fields: ticket.custom_fields,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            isLoading={updateTicket.isPending}
          />
        </Card>
      ) : (
        <>
          <div className="hidden xl:grid xl:grid-cols-12 gap-6">
            <Card className="xl:col-span-5" padding="lg">
              <h2 className="text-sm font-semibold text-heading mb-5">Details</h2>
              {detailsPanel}
            </Card>
            <div className="xl:col-span-7 space-y-6">
              <Card padding="lg">
                <h2 className="text-sm font-semibold text-heading mb-5">
                  Emails
                  {ticketEmails.length > 0 && (
                    <span className="ml-2 text-body-muted font-normal">
                      ({ticketEmails.length})
                    </span>
                  )}
                </h2>
                {emailsPanel}
              </Card>
              <Card padding="lg">
                <h2 className="text-sm font-semibold text-heading mb-5">
                  Activity
                  {notes.length > 0 && (
                    <span className="ml-2 text-body-muted font-normal">
                      ({notes.length})
                    </span>
                  )}
                </h2>
                {activityPanel}
              </Card>
            </div>
          </div>

          <Card className="xl:hidden" padding="none">
            <div className="px-6 pt-4 border-b border-[var(--card-border)]">
              <nav className="flex gap-6" aria-label="Ticket sections">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      tab === t.id
                        ? "border-[var(--secondary)] text-[var(--primary)]"
                        : "border-transparent text-body-muted hover:text-heading"
                    }`}
                  >
                    {t.label}
                    {(t.count ?? 0) > 0 && (
                      <span className="ml-1 text-body-muted">({t.count})</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-6">
              {tab === "details" && detailsPanel}
              {tab === "emails" && emailsPanel}
              {tab === "activity" && activityPanel}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
