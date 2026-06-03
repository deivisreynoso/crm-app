"use client";

import { InlineEditableField } from "@/components/ui/inline-editable-field";
import { InlineSelectField } from "@/components/ui/inline-select-field";
import { AssociationSelect } from "@/components/ui/association-select";
import { RecordDates } from "@/components/ui/record-dates";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/lib/constants/ticket-fields";
import { useContacts } from "@/hooks/useContacts";
import { formatDateTime } from "@/lib/utils";
import { EntityCustomFieldsOverview } from "@/components/custom-fields/entity-custom-fields-overview";
import { TagsChips } from "@/components/forms/tags-chips";
import type { Ticket, TicketFormInput } from "@/types";

interface TicketOverviewProps {
  ticket: Ticket;
  onSaveField: (patch: Partial<TicketFormInput>) => Promise<void>;
  readOnly?: boolean;
}

export function TicketOverview({ ticket, onSaveField, readOnly }: TicketOverviewProps) {
  const { data: contactsData } = useContacts(1, 200);
  const contacts = contactsData?.data ?? [];

  const displaySubject = ticket.subject?.trim() || ticket.title;

  const contactOptions = contacts.map((c) => ({
    id: c.id,
    label: `${c.first_name} ${c.last_name}`,
    href: `/contacts/${c.id}`,
  }));

  return (
    <div className="space-y-5">
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
          Ticket number
        </dt>
        <dd className="text-sm font-mono text-heading">{ticket.ticket_number ?? "—"}</dd>
      </div>

      <AssociationSelect
        label="Contact"
        value={ticket.contact_id ?? ""}
        options={contactOptions}
        placeholder="Link contact"
        onChange={async (id) => {
          if (!id) return;
          await onSaveField({ contact_id: id });
        }}
        disabled={readOnly}
      />

      <InlineSelectField
        label="Status"
        value={ticket.status}
        options={TICKET_STATUSES}
        readOnly={readOnly}
        onSave={async (v) =>
          onSaveField({
            status: v as Ticket["status"],
          })
        }
      />
      <InlineSelectField
        label="Priority"
        value={ticket.priority}
        options={TICKET_PRIORITIES}
        readOnly={readOnly}
        onSave={async (v) =>
          onSaveField({
            priority: v as Ticket["priority"],
          })
        }
      />
      <InlineSelectField
        label="Category"
        value={ticket.category}
        options={TICKET_CATEGORIES}
        allowEmpty
        readOnly={readOnly}
        onSave={async (v) => onSaveField({ category: v || undefined })}
      />

      <InlineEditableField
        label="Subject"
        value={displaySubject}
        required
        className="sm:col-span-2"
        readOnly={readOnly}
        onSave={async (value) => {
          await onSaveField({ subject: value, title: value });
        }}
      />
      <InlineEditableField
        label="Description"
        value={ticket.description}
        multiline
        className="sm:col-span-2"
        readOnly={readOnly}
        onSave={async (v) => onSaveField({ description: v || undefined })}
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

      {ticket.resolved_at && (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
            Resolved
          </dt>
          <dd className="text-sm text-heading">{formatDateTime(ticket.resolved_at)}</dd>
        </div>
      )}

      <RecordDates
        createdAt={ticket.created_at}
        updatedAt={ticket.updated_at}
        className="sm:col-span-2"
      />

      <div className="sm:col-span-2">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-2">
          Tags
        </dt>
        <dd>
          <TagsChips
            tags={ticket.tags ?? []}
            readOnly={readOnly}
            onChange={(next) => void onSaveField({ tags: next.join(", ") })}
          />
        </dd>
      </div>
    </dl>

    <EntityCustomFieldsOverview
      entityType="ticket"
      values={ticket.custom_fields}
      readOnly={readOnly}
      onSave={async (custom_fields) => onSaveField({ custom_fields })}
    />
    </div>
  );
}
