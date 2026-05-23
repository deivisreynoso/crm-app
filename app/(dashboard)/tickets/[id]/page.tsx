"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, ticketPriorityVariant, ticketStatusVariant } from "@/components/ui/badge";
import { ActivityPanel } from "@/components/contact/activity-panel";
import { TicketForm } from "@/components/tickets/ticket-form";
import { TicketOverview } from "@/components/tickets/ticket-overview";
import { useTicket, useUpdateTicket } from "@/hooks/useTickets";
import { useTicketNotes, useCreateTicketNote } from "@/hooks/useTicketNotes";
import { formatServiceTicketLabel } from "@/lib/service-ticket-number";
import type { TicketFormInput } from "@/types";

type PageProps = { params: Promise<{ id: string }> };
type TicketTab = "details" | "activity";

export default function ServiceTicketDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<TicketTab>("details");
  const [editing, setEditing] = useState(false);

  const { data: ticket, isLoading, error } = useTicket(id);
  const updateTicket = useUpdateTicket(id);
  const { data: notes = [] } = useTicketNotes(id);
  const createNote = useCreateTicketNote(id);

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

  const detailsPanel = (
    <TicketOverview ticket={ticket} onSaveField={handleSaveField} />
  );

  const activityPanel = (
    <ActivityPanel
      notes={notes}
      isAdding={createNote.isPending}
      onAdd={async (input) => {
        await createNote.mutateAsync(input);
      }}
    />
  );

  return (
    <div className="space-y-6 w-full">
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
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
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
            <Card className="xl:col-span-7" padding="lg">
              <h2 className="text-sm font-semibold text-heading mb-5">
                Activity
                {notes.length > 0 && (
                  <span className="ml-2 text-body-muted font-normal">({notes.length})</span>
                )}
              </h2>
              {activityPanel}
            </Card>
          </div>

          <Card className="xl:hidden" padding="none">
            <div className="px-6 pt-4 border-b border-[var(--card-border)]">
              <nav className="flex gap-6" aria-label="Ticket sections">
                {(
                  [
                    { id: "details" as const, label: "Details" },
                    { id: "activity" as const, label: "Activity", count: notes.length },
                  ] as const
                ).map((t) => (
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
                    {"count" in t && t.count > 0 && (
                      <span className="ml-1 text-body-muted">({t.count})</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-6">
              {tab === "details" && detailsPanel}
              {tab === "activity" && activityPanel}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
