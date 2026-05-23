"use client";

import Link from "next/link";
import { InlineEditableField } from "@/components/ui/inline-editable-field";
import { Badge, ticketPriorityVariant, ticketStatusVariant } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { Ticket, TicketFormInput } from "@/types";

interface TicketOverviewProps {
  ticket: Ticket;
  onSaveField: (patch: Partial<TicketFormInput>) => Promise<void>;
}

export function TicketOverview({ ticket, onSaveField }: TicketOverviewProps) {
  const save =
    (field: keyof TicketFormInput) => (value: string) =>
      onSaveField({ [field]: value } as Partial<TicketFormInput>);

  const displaySubject = ticket.subject?.trim() || ticket.title;

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          Ticket number
        </dt>
        <dd className="text-sm font-mono text-heading">{ticket.ticket_number ?? "—"}</dd>
      </div>
      <InlineEditableField
        label="Subject"
        value={displaySubject}
        required
        onSave={async (value) => {
          await onSaveField({ subject: value, title: value });
        }}
      />
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          Status
        </dt>
        <dd>
          <Badge variant={ticketStatusVariant(ticket.status)}>
            {ticket.status.replace("_", " ")}
          </Badge>
        </dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          Priority
        </dt>
        <dd>
          <Badge variant={ticketPriorityVariant(ticket.priority)}>
            {ticket.priority}
          </Badge>
        </dd>
      </div>
      <InlineEditableField
        label="Category"
        value={ticket.category}
        onSave={save("category")}
      />
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          Account
        </dt>
        <dd className="text-sm font-medium text-heading">
          {ticket.company ? (
            <Link
              href={`/accounts/${ticket.company_id}`}
              className="text-[var(--secondary)] hover:underline"
            >
              {ticket.company.name}
            </Link>
          ) : (
            <span className="text-body-muted font-normal">Not set</span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          Contact
        </dt>
        <dd className="text-sm font-medium text-heading">
          {ticket.contact ? (
            <Link
              href={`/contacts/${ticket.contact_id}`}
              className="text-[var(--secondary)] hover:underline"
            >
              {ticket.contact.first_name} {ticket.contact.last_name}
            </Link>
          ) : (
            <span className="text-body-muted font-normal">Not set</span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          Created
        </dt>
        <dd className="text-sm text-heading">{formatDateTime(ticket.created_at)}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          Last updated
        </dt>
        <dd className="text-sm text-heading">{formatDateTime(ticket.updated_at)}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          Resolved
        </dt>
        <dd className="text-sm text-heading">
          {ticket.resolved_at ? formatDateTime(ticket.resolved_at) : (
            <span className="text-body-muted font-normal">Not set</span>
          )}
        </dd>
      </div>
      <InlineEditableField
        label="Description"
        value={ticket.description}
        multiline
        className="sm:col-span-2"
        onSave={save("description")}
      />
      {ticket.resolution_notes && (
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
            Resolution notes
          </dt>
          <dd className="text-sm text-heading whitespace-pre-wrap leading-relaxed">
            {ticket.resolution_notes}
          </dd>
        </div>
      )}
    </dl>
  );
}
