"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-shell";
import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { CreateEventModal } from "@/components/calendar/create-event-modal";
import { EventDetailModal } from "@/components/calendar/event-detail-modal";
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from "@/hooks/useCalendarEvents";
import { shiftMonth } from "@/lib/calendar/utils";
import { GoogleCalendarBanner } from "@/components/calendar/google-calendar-banner";
import { useContacts } from "@/hooks/useContacts";
import type { CalendarEvent } from "@/types";

export function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>();
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const range = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return {
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(end, "yyyy-MM-dd"),
    };
  }, [month]);

  const { data: events = [], isLoading } = useCalendarEvents(range);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();
  const { data: contactsData } = useContacts(1, 300);
  const contacts = contactsData?.data ?? [];

  const contactName = selected?.contact_id
    ? contacts.find((c) => c.id === selected.contact_id)
    : null;

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Calendar"
        description="Schedule meetings with contacts — Zoom, Meet, in person, and more"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setCreateDate(new Date());
              setCreateOpen(true);
            }}
          >
            New meeting
          </Button>
        }
      />

      <GoogleCalendarBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--card-border)] hover:bg-[var(--sidebar-hover)]"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-heading min-w-[10rem] text-center">
            {format(month, "MMMM yyyy")}
          </h2>
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--card-border)] hover:bg-[var(--sidebar-hover)]"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>
          Today
        </Button>
      </div>

      {isLoading ? (
        <p className="text-body-muted text-sm">Loading calendar…</p>
      ) : (
        <CalendarMonthView
          month={month}
          events={events}
          onSelectDate={(day) => {
            setEditing(null);
            setCreateDate(day);
            setCreateOpen(true);
          }}
          onSelectEvent={setSelected}
        />
      )}

      <CreateEventModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        initialDate={createDate}
        initial={editing}
        isLoading={createEvent.isPending || updateEvent.isPending}
        onSubmit={async (data) => {
          if (editing) {
            await updateEvent.mutateAsync({ id: editing.id, data });
          } else {
            await createEvent.mutateAsync(data);
          }
        }}
      />

      <EventDetailModal
        event={selected}
        contactName={
          contactName
            ? `${contactName.first_name} ${contactName.last_name}`
            : undefined
        }
        onClose={() => setSelected(null)}
        onEdit={() => {
          setEditing(selected);
          setSelected(null);
          setCreateOpen(true);
        }}
        onDelete={async () => {
          if (selected) await deleteEvent.mutateAsync(selected.id);
        }}
        deleteLoading={deleteEvent.isPending}
      />
    </div>
  );
}
