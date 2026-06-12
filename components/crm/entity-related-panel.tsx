"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { formatCurrency } from "@/lib/utils";
import { useCreateContact } from "@/hooks/useContacts";
import { usePipelines } from "@/hooks/usePipelines";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { uploadErrorMessage } from "@/hooks/useDocuments";
import { formatApiError } from "@/lib/validation-errors";
import { CreateEventModal } from "@/components/calendar/create-event-modal";
import { EventDetailModal } from "@/components/calendar/event-detail-modal";
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from "@/hooks/useCalendarEvents";
import {
  calendarEventColor,
  formatEventRange,
  LOCATION_TYPES,
} from "@/lib/calendar/utils";
import type {
  CalendarEvent,
  CompanyRelated,
  CrmDocument,
  Invoice,
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
  invoices?: Invoice[];
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
  invoices = [],
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
  const [selectedCalendarEvent, setSelectedCalendarEvent] =
    useState<CalendarEvent | null>(null);
  const [editingCalendarEvent, setEditingCalendarEvent] =
    useState<CalendarEvent | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const createContact = useCreateContact();
  const createCalendarEvent = useCreateCalendarEvent();
  const updateCalendarEvent = useUpdateCalendarEvent();
  const deleteCalendarEvent = useDeleteCalendarEvent();
  const { data: pipelines = [] } = usePipelines();
  const defaultPipeline = pipelines[0];
  const createOpportunity = useCreateOpportunity(defaultPipeline?.id ?? "");
  const { canWrite } = useWorkspaceCapabilities();
  const { dict } = useCrmLocale();
  const rel = dict.related;
  const router = useRouter();

  const newQuoteHref = useMemo(() => {
    if (context.contactId) {
      const params = new URLSearchParams({ contact_id: context.contactId });
      if (context.companyId) params.set("company_id", context.companyId);
      return `/quotes/new?${params.toString()}`;
    }
    if (context.companyId) {
      return `/quotes/new?company_id=${context.companyId}`;
    }
    return "/quotes/new";
  }, [context.contactId, context.companyId]);

  const newInvoiceHref = useMemo(() => {
    const params = new URLSearchParams({ create: "1" });
    if (context.contactId) params.set("contact_id", context.contactId);
    return `/finances/invoices?${params.toString()}`;
  }, [context.contactId]);

  return (
    <div className="space-y-4">
      {showAccountContacts && context.companyId && (
        <RelatedListSection
          title={rel.contacts}
          count={contacts.length}
          iconBg="bg-violet-600"
          iconGlyph="👤"
          viewAllHref={`/contacts?company=${context.companyId}`}
          onNew={canWrite ? () => setContactModal(true) : undefined}
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
        title={rel.opportunities}
        count={opportunities.length}
        iconBg="bg-amber-500"
        iconGlyph="◆"
        viewAllHref="/opportunities"
        onNew={canWrite && defaultPipeline ? () => setOppModal(true) : undefined}
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
        title={rel.tickets}
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
        onNew={canWrite && onCreateTicket ? () => setTicketModal(true) : undefined}
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
        title={rel.quotes}
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
        onNew={canWrite ? () => router.push(newQuoteHref) : undefined}
        newLabel={rel.new}
      >
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
                    {d.quote_reference ? `${d.quote_reference} · ` : ""}
                    {d.status}
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
        title={rel.invoices}
        count={invoices.length}
        iconBg="bg-emerald-600"
        iconGlyph="🧾"
        viewAllHref={
          context.contactId
            ? `/finances/invoices?contact_id=${context.contactId}`
            : "/finances/invoices"
        }
        onNew={canWrite ? () => router.push(newInvoiceHref) : undefined}
        newLabel={rel.new}
      >
        {invoices.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No invoices yet.</p>
        ) : (
          <ul className="space-y-2">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-2 text-sm border border-[var(--card-border)] rounded-md px-3 py-2 bg-[var(--card)]"
              >
                <div className="min-w-0">
                  <Link
                    href={`/finances/invoices/${inv.id}`}
                    className="font-medium text-[var(--primary)] hover:underline truncate block"
                  >
                    {inv.invoice_number || "Invoice"}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {inv.status}
                    {inv.total != null && Number(inv.total) > 0
                      ? ` · ${formatCurrency(Number(inv.total), inv.currency)}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </RelatedListSection>

      <RelatedListSection
        title={rel.attachments}
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
          canWrite && onCreateDocument
            ? () => {
                setDocError(null);
                setDocModal(true);
              }
            : undefined
        }
        newLabel={rel.upload}
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
        title={rel.calendar}
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
        onNew={canWrite ? () => setCalendarModal(true) : undefined}
        newLabel={rel.schedule}
      >
        {calendarEvents.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No events scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {calendarEvents.map((e) => {
              const locLabel = LOCATION_TYPES.find(
                (t) => t.value === e.location_type
              )?.label;
              const whenWhere = [
                formatEventRange(e.start_time, e.end_time),
                locLabel || e.location,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarEvent(e)}
                    className="w-full text-left text-sm border border-[var(--card-border)] rounded-md px-3 py-2 bg-[var(--card)] hover:bg-[var(--sidebar-hover)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: calendarEventColor(e) }}
                      />
                      <p className="font-medium text-[var(--foreground)]">{e.title}</p>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5 pl-4">{whenWhere}</p>
                  </button>
                </li>
              );
            })}
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
        onClose={() => {
          setCalendarModal(false);
          setEditingCalendarEvent(null);
        }}
        initial={editingCalendarEvent}
        defaultContactId={context.contactId}
        onSubmit={async (data) => {
          if (editingCalendarEvent) {
            await updateCalendarEvent.mutateAsync({
              id: editingCalendarEvent.id,
              data,
            });
          } else {
            await createCalendarEvent.mutateAsync({
              ...data,
              contact_id: data.contact_id ?? context.contactId,
            });
          }
          setCalendarModal(false);
          setEditingCalendarEvent(null);
          onCalendarEventCreated?.();
        }}
        isLoading={
          createCalendarEvent.isPending || updateCalendarEvent.isPending
        }
      />

      <EventDetailModal
        event={selectedCalendarEvent}
        onClose={() => setSelectedCalendarEvent(null)}
        onEdit={() => {
          if (!selectedCalendarEvent) return;
          setEditingCalendarEvent(selectedCalendarEvent);
          setSelectedCalendarEvent(null);
          setCalendarModal(true);
        }}
        onDelete={async () => {
          if (!selectedCalendarEvent) return;
          await deleteCalendarEvent.mutateAsync(selectedCalendarEvent.id);
          setSelectedCalendarEvent(null);
          onCalendarEventCreated?.();
        }}
        deleteLoading={deleteCalendarEvent.isPending}
      />

      <Modal open={docModal} onClose={() => setDocModal(false)} title="Upload document">
        {onCreateDocument && (
          <DocumentUploadForm
            defaultContactId={context.contactId}
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
