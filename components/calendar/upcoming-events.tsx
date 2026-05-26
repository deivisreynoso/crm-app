"use client";

import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { calendarEventColor, formatEventRange } from "@/lib/calendar/utils";

interface UpcomingEventsProps {
  contactId: string;
  onSelect?: (eventId: string) => void;
}

export function UpcomingEvents({ contactId, onSelect }: UpcomingEventsProps) {
  const { data: events = [], isLoading } = useCalendarEvents({
    contact_id: contactId,
  });

  const upcoming = events
    .filter((e) => new Date(e.start_time) >= new Date())
    .slice(0, 5);

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading meetings…</p>;
  }

  if (upcoming.length === 0) {
    return <p className="text-sm text-body-muted">No upcoming meetings.</p>;
  }

  return (
    <ul className="space-y-2">
      {upcoming.map((ev) => (
        <li key={ev.id}>
          <button
            type="button"
            onClick={() => onSelect?.(ev.id)}
            className="w-full text-left rounded-lg border border-[var(--card-border)] px-3 py-2 hover:bg-[var(--sidebar-hover)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: calendarEventColor(ev) }}
              />
              <span className="text-sm font-medium text-heading">{ev.title}</span>
            </div>
            <p className="text-xs text-body-muted mt-1 pl-4">
              {formatEventRange(ev.start_time, ev.end_time)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
