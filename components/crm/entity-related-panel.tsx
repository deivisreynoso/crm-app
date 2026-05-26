"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import {
  RelatedCardsRow,
  RelatedListSection,
  RelatedRecordCard,
} from "@/components/crm/related-list-section";
import { TicketForm } from "@/components/tickets/ticket-form";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { ContactForm } from "@/components/forms/ContactForm";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCreateContact } from "@/hooks/useContacts";
import { usePipelines } from "@/hooks/usePipelines";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { uploadErrorMessage } from "@/hooks/useDocuments";
import { formatApiError } from "@/lib/validation-errors";
import { CreateEventModal } from "@/components/calendar/create-event-modal";
import { useCreateCalendarEvent } from "@/hooks/useCalendar";
import type {
  CalendarEvent,
  CompanyRelated,
  CrmDocument,
  OpportunityWithContact,
  Ticket,
} from "@/types";

import type { TicketFormInput, DocumentFormInput } from "@/types";

type EntityContext = {
  companyId?: string;
  contactId?: string;
};

interface EntityRelatedPanelProps {
  context: EntityContext;
  /** Only true on Account record pages — never on Contact */
  showAccountContacts?: boolean;
  opportunities?: OpportunityWithContact[];
  tickets?: Ticket[];
  quotes?: CrmDocument[];
  attachments?: CrmDocument[];
  calendarEvents?: CalendarEvent[];
  contacts?: CompanyRelated["contacts"];
  onCreateTicket?: (data: TicketFormInput) => Promise<void>;
  onCreateDocument?: (meta: DocumentFormInput, file?: File | null) => Promise<void>;
  onContactCreated?: () => void;
  onOpportunityCreated?: () => void;
  onCalendarEventCreated?: () => void;
  ticketLoading?: boolean;
  documentLoading?: boolean;
}

export function EntityRelatedPanel({
  context,
  showAccountContacts = false,
  opportunities = [],
  tickets = [],
  quotes = [],
  attachments = [],
  calendarEvents = [],
  contacts = [],
  onCreateTicket,
  onCreateDocument,
  onContactCreated,
  onOpportunityCreated,
  onCalendarEventCreated,
  ticketLoading,
  documentLoading,
}: EntityRelatedPanelProps) {
  const [ticketModal, setTicketModal] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [oppModal, setOppModal] = useState(false);
  const [calendarModal, setCalendarModal] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const createContact = useCreateContact();
  const createCalendarEvent = useCreateCalendarEvent();
  const { data: pipelines = [] } = usePipelines();
  const defaultPipeline = pipelines[0];
  const createOpportunity = useCreateOpportunity(defaultPipeline?.id ?? "");

  return (
    <div className="space-y-4">
      {showAccountContacts && context.companyId && (
        <RelatedListSection
          title="Contacts"
          count={contacts.length}
          iconBg="bg-violet-600"
          iconGlyph="👤"
          viewAllHref={`/contacts?company=${context.companyId}`}
          onNew={() => setContactModal(true)}
        >
          {contacts.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No contacts on this account.</p>
          ) : (
            <RelatedCardsRow>
              {contacts.map((c) => (
                <RelatedRecordCard
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  title={`${c.first_name} ${c.last_name}`}
                  subtitle={[c.title, c.email].filter(Boolean).join(" · ")}
                />
              ))}
            </RelatedCardsRow>
          )}
        </RelatedListSection>
      )}

      <RelatedListSection
        title="Opportunities"
        count={opportunities.length}
        iconBg="bg-amber-500"
        iconGlyph="◆"
        viewAllHref="/opportunities"
        onNew={defaultPipeline ? () => setOppModal(true) : undefined}
      >
        {opportunities.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No opportunities yet.</p>
        ) : (
          <RelatedCardsRow>
            {opportunities.map((o) => (
              <RelatedRecordCard
                key={o.id}
                href="/opportunities"
                title={o.title}
                subtitle={o.contact ? `${o.contact.first_name} ${o.contact.last_name}` : undefined}
                meta={
                  o.value != null && Number(o.value) > 0
                    ? formatCurrency(Number(o.value), o.currency)
                    : undefined
                }
              />
            ))}
          </RelatedCardsRow>
        )}
      </RelatedListSection>

      <RelatedListSection
        title="Service Tickets"
        count={tickets.length}
        iconBg="bg-rose-500"
        iconGlyph="▣"
        viewAllHref={
          context.contactId
            ? `/tickets?contact_id=${context.contactId}`
            : context.companyId
              ? `/tickets?company_id=${context.companyId}`
              : "/tickets"
        }
        onNew={onCreateTicket ? () => setTicketModal(true) : undefined}
      >
        {tickets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No service tickets yet.</p>
        ) : (
          <RelatedCardsRow>
            {tickets.map((t) => (
              <RelatedRecordCard
                key={t.id}
                href={`/tickets/${t.id}`}
                title={t.ticket_number ? `${t.ticket_number} — ${t.title}` : t.title}
                subtitle={
                  t.contact
                    ? `${t.contact.first_name} ${t.contact.last_name}`
                    : t.company?.name
                }
                meta={
                  <span className="capitalize">
                    {t.status.replace("_", " ")} · {t.priority}
                  </span>
                }
              />
            ))}
          </RelatedCardsRow>
        )}
      </RelatedListSection>

      <RelatedListSection
        title="Quotes"
        count={quotes.length}
        iconBg="bg-slate-500"
        iconGlyph="📄"
        viewAllHref={
          context.contactId
            ? `/quotes?contact_id=${context.contactId}`
            : context.companyId
              ? `/quotes?company_id=${context.companyId}`
              : "/quotes"
        }
      >
        {context.contactId && (
          <div className="mb-3">
            <Link
              href={`/quotes/new?contact_id=${context.contactId}${
                context.companyId ? `&company_id=${context.companyId}` : ""
              }`}
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              + New quote
            </Link>
          </div>
        )}
        {quotes.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No quotes yet.</p>
        ) : (
          <ul className="space-y-2">
            {quotes.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 text-sm border border-[var(--card-border)] rounded-md px-3 py-2 bg-[var(--card)]"
              >
                <div className="min-w-0">
                  <Link
                    href={`/quotes/${d.id}`}
                    className="font-medium text-[var(--primary)] hover:underline truncate block"
                  >
                    {d.title}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {d.type} · {d.status}
                    {d.total_amount != null && Number(d.total_amount) > 0
                      ? ` · ${formatCurrency(Number(d.total_amount))}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </RelatedListSection>

      <RelatedListSection
        title="Attachments"
        count={attachments.length}
        iconBg="bg-gray-500"
        iconGlyph="📎"
        viewAllHref={
          context.contactId
            ? `/attachments?contact_id=${context.contactId}`
            : context.companyId
              ? `/attachments?company_id=${context.companyId}`
              : "/attachments"
        }
        onNew={
          onCreateDocument
            ? () => {
                setDocError(null);
                setDocModal(true);
              }
            : undefined
        }
        newLabel="Upload"
      >
        {attachments.length === 0 ? (
          <div
            className="border-2 border-dashed border-[var(--card-border)] rounded-lg p-8 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (onCreateDocument && e.dataTransfer.files[0]) {
                setDocModal(true);
              }
            }}
          >
            <p className="text-sm text-[var(--muted)] mb-2">No attachments yet</p>
            {onCreateDocument && (
              <button
                type="button"
                onClick={() => setDocModal(true)}
                className="text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Upload file
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {attachments.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 text-sm border border-[var(--card-border)] rounded-md px-3 py-2 bg-[var(--card)]"
              >
                <div className="min-w-0">
                  <Link
                    href={`/attachments/${d.id}`}
                    className="font-medium text-[var(--primary)] hover:underline truncate block"
                  >
                    {d.title}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {d.file_name ?? "attachment"}
                  </p>
                </div>
                {(d.file_url || d.storage_path) && (
                  <a
                    href={`/api/documents/${d.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--primary)] shrink-0 hover:underline"
                  >
                    Open
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </RelatedListSection>

      <RelatedListSection
        title="Calendar"
        count={calendarEvents.length}
        iconBg="bg-teal-600"
        iconGlyph="📅"
        viewAllHref={
          context.contactId
            ? `/calendar?contact_id=${context.contactId}&new=1`
            : context.companyId
              ? `/calendar?company_id=${context.companyId}&new=1`
              : "/calendar"
        }
        onNew={() => setCalendarModal(true)}
        newLabel="Schedule"
      >
        {calendarEvents.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No events scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {calendarEvents.map((e) => (
              <li
                key={e.id}
                className="text-sm border border-[var(--card-border)] rounded-md px-3 py-2 bg-[var(--card)]"
              >
                <p className="font-medium text-[var(--foreground)]">{e.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {formatDate(e.start_time)}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </RelatedListSection>

      <Modal open={contactModal} onClose={() => setContactModal(false)} title="New contact">
        <ContactForm
          defaultValues={{ company_id: context.companyId ?? "" }}
          onSubmit={async (data) => {
            await createContact.mutateAsync(data);
            setContactModal(false);
            onContactCreated?.();
          }}
          isLoading={createContact.isPending}
          submitLabel="Create contact"
        />
      </Modal>

      <Modal
        open={oppModal}
        onClose={() => setOppModal(false)}
        title="New opportunity"
      >
        {defaultPipeline ? (
          <OpportunityForm
            pipelineId={defaultPipeline.id}
            stages={defaultPipeline.stages}
            defaultContactId={context.contactId}
            defaultCompanyId={context.companyId}
            onSubmit={async (data) => {
              await createOpportunity.mutateAsync(data);
              setOppModal(false);
              onOpportunityCreated?.();
            }}
            onCancel={() => setOppModal(false)}
            isLoading={createOpportunity.isPending}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Create a pipeline first under Opportunities.
          </p>
        )}
      </Modal>

      <Modal
        open={ticketModal}
        onClose={() => {
          setTicketModal(false);
          setTicketError(null);
        }}
        title="New service ticket"
        size="xl"
      >
        {onCreateTicket && (
          <>
            {ticketError && (
              <p className="mb-4 text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
                {ticketError}
              </p>
            )}
            <TicketForm
              defaultContactId={context.contactId}
              defaultCompanyId={context.companyId}
              onSubmit={async (data) => {
                setTicketError(null);
                try {
                  await onCreateTicket(data);
                  setTicketModal(false);
                } catch (err) {
                  setTicketError(
                    formatApiError(
                      err,
                      "We could not create this ticket. Please try again."
                    )
                  );
                  throw err;
                }
              }}
              onCancel={() => {
                setTicketModal(false);
                setTicketError(null);
              }}
              isLoading={ticketLoading}
            />
          </>
        )}
      </Modal>

      <CreateEventModal
        open={calendarModal}
        onClose={() => setCalendarModal(false)}
        defaultContactId={context.contactId}
        defaultCompanyId={context.companyId}
        onSubmit={async (data) => {
          await createCalendarEvent.mutateAsync({
            ...data,
            contact_id: data.contact_id ?? context.contactId,
            company_id: data.company_id ?? context.companyId,
          });
          setCalendarModal(false);
          onCalendarEventCreated?.();
        }}
        isLoading={createCalendarEvent.isPending}
      />

      <Modal open={docModal} onClose={() => setDocModal(false)} title="Upload document">
        {onCreateDocument && (
          <DocumentUploadForm
            defaultContactId={context.contactId}
            defaultCompanyId={context.companyId}
            errorMessage={docError}
            onSubmit={async (meta, file) => {
              try {
                setDocError(null);
                await onCreateDocument(meta, file);
                setDocModal(false);
              } catch (err) {
                setDocError(uploadErrorMessage(err));
              }
            }}
            onCancel={() => setDocModal(false)}
            isLoading={documentLoading}
          />
        )}
      </Modal>
    </div>
  );
}
