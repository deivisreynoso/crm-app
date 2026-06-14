"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ListActions } from "@/components/ui/list-actions";
import { Badge, ticketPriorityVariant, ticketStatusVariant } from "@/components/ui/badge";
import {
  PageHeader,
  DataTableShell,
  DataTable,
  DataTableHead,
  DataTableHeadCell,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from "@/components/ui/page-shell";
import { TicketForm } from "@/components/tickets/ticket-form";
import {
  useTickets,
  useCreateTicket,
  useDeleteTicket,
} from "@/hooks/useTickets";
import { SERVICE_TICKET_OBJECT } from "@/lib/constants/service-tickets";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { ListFiltersPanel } from "@/components/filters/list-filters-panel";
import { FilterField } from "@/components/filters/filter-field";
import { formatDate } from "@/lib/utils";
import { formatApiError } from "@/lib/validation-errors";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

export default function ServiceTicketsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();

  const { data: tickets = [], isLoading } = useTickets({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(createdFrom ? { created_from: createdFrom } : {}),
    ...(createdTo ? { created_to: createdTo } : {}),
  });
  const { canWrite } = useWorkspaceCapabilities();
  const createTicket = useCreateTicket();
  const deleteTicket = useDeleteTicket();

  const hasActiveFilters = Boolean(statusFilter || createdFrom || createdTo);

  function clearFilters() {
    setStatusFilter("");
    setCreatedFrom("");
    setCreatedTo("");
  }

  return (
    <div className="space-y-6 w-full">
      <ConfirmDialog {...dialogProps} />
      <PageHeader
        title={SERVICE_TICKET_OBJECT.plural}
        description="Support requests linked to accounts and contacts"
        actions={
          canWrite ? (
            <Button size="sm" onClick={() => setModalOpen(true)}>
              + New service ticket
            </Button>
          ) : undefined
        }
      />

      <ListFiltersPanel
        gridClassName="list-filters-panel__grid--tickets"
        savedFilters={
          <SavedFiltersBar
            entityType="ticket"
            currentConfig={{
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(createdFrom ? { created_from: createdFrom } : {}),
              ...(createdTo ? { created_to: createdTo } : {}),
            }}
            onApply={(config) => {
              setStatusFilter(typeof config.status === "string" ? config.status : "");
              setCreatedFrom(
                typeof config.created_from === "string" ? config.created_from : ""
              );
              setCreatedTo(
                typeof config.created_to === "string" ? config.created_to : ""
              );
            }}
          />
        }
        resultCount={
          <span className="list-filters-panel__count">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </span>
        }
        showClear={hasActiveFilters}
        onClear={clearFilters}
      >
        <FilterField label="Status" htmlFor="ticket-status">
          <select
            id="ticket-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-input-compact"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="on_hold">On hold</option>
            <option value="closed">Closed</option>
          </select>
        </FilterField>
        <FilterField label="Created from" htmlFor="ticket-created-from">
          <input
            id="ticket-created-from"
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="filter-input-compact"
          />
        </FilterField>
        <FilterField label="Created to" htmlFor="ticket-created-to">
          <input
            id="ticket-created-to"
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="filter-input-compact"
          />
        </FilterField>
      </ListFiltersPanel>

      <DataTableShell
        isLoading={isLoading}
        empty={
          !isLoading && tickets.length === 0
            ? "No service tickets yet."
            : undefined
        }
      >
        {tickets.length > 0 && (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeadCell>Ticket #</DataTableHeadCell>
                <DataTableHeadCell>Subject</DataTableHeadCell>
                <DataTableHeadCell>Contact</DataTableHeadCell>
                <DataTableHeadCell>Category</DataTableHeadCell>
                <DataTableHeadCell>Status</DataTableHeadCell>
                <DataTableHeadCell>Priority</DataTableHeadCell>
                <DataTableHeadCell>Created</DataTableHeadCell>
                <DataTableHeadCell align="right">Actions</DataTableHeadCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {tickets.map((t) => (
                <DataTableRow key={t.id}>
                  <DataTableCell>
                    <Link
                      href={`/tickets/${t.id}`}
                      className="font-mono text-sm text-[var(--secondary)] hover:underline"
                    >
                      {t.ticket_number ?? "—"}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    <Link
                      href={`/tickets/${t.id}`}
                      className="font-medium text-heading hover:underline"
                    >
                      {t.subject?.trim() || t.title}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="text-body-muted space-y-0.5">
                      {t.contact && t.contact_id ? (
                        <Link
                          href={`/contacts/${t.contact_id}`}
                          className="hover:underline block text-heading"
                        >
                          {t.contact.first_name} {t.contact.last_name}
                        </Link>
                      ) : (
                        <span className="text-[var(--error)] text-xs">No contact linked</span>
                      )}
                      {t.company?.name && (
                        <span className="block text-xs">{t.company.name}</span>
                      )}
                      {!t.contact && !t.company && "—"}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">{t.category || "—"}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={ticketStatusVariant(t.status)}>
                      {t.status.replace("_", " ")}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={ticketPriorityVariant(t.priority)}>
                      {t.priority}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">
                      {t.created_at ? formatDate(t.created_at) : "—"}
                    </span>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <ListActions
                      viewHref={`/tickets/${t.id}`}
                      onDelete={canWrite ? async () => {
                        const ok = await confirm({
                          title: "Delete service ticket?",
                          description:
                            "This ticket will be permanently removed along with its activity notes.",
                          confirmLabel: "Delete ticket",
                          destructive: true,
                        });
                        if (!ok) return;
                        await deleteTicket.mutateAsync(t.id);
                      } : undefined}
                    />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </DataTableShell>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCreateError(null);
        }}
        title="New service ticket"
        size="xl"
      >
        {createError && (
          <p className="mb-4 text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
            {createError}
          </p>
        )}
        <TicketForm
          onSubmit={async (data) => {
            setCreateError(null);
            try {
              const res = await createTicket.mutateAsync(data);
              setModalOpen(false);
              if (res.data?.id) {
                window.location.href = `/tickets/${res.data.id}`;
              }
            } catch (err) {
              setCreateError(
                formatApiError(
                  err,
                  "We could not create this ticket. Please try again."
                )
              );
              throw err;
            }
          }}
          onCancel={() => {
            setModalOpen(false);
            setCreateError(null);
          }}
          isLoading={createTicket.isPending}
        />
      </Modal>
    </div>
  );
}
