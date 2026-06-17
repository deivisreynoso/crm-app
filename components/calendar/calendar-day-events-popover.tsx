"use client";

import { format } from "date-fns";
import { calendarEventColor, formatEventClock } from "@/lib/calendar/utils";
import type { CalendarEvent } from "@/types";

type Props = {
  day: Date;
  events: CalendarEvent[];
  anchorRect: DOMRect | null;
  timeZone?: string | null;
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
};

export function CalendarDayEventsPopover({
  day,
  events,
  anchorRect,
  timeZone,
  onClose,
  onSelectEvent,
}: Props) {
  if (!anchorRect) return null;

  const top = anchorRect.bottom + 4;
  const left = Math.min(anchorRect.left, window.innerWidth - 280);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40"
        aria-label="Close day events"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-md)]"
        style={{ top, left }}
        role="dialog"
        aria-label={format(day, "MMMM d, yyyy")}
      >
        <div className="sticky top-0 border-b border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
          <p className="text-sm font-semibold text-heading">
            {format(day, "EEEE, MMM d")}
          </p>
          <p className="text-xs text-body-muted">
            {events.length} event{events.length === 1 ? "" : "s"}
          </p>
        </div>
        <ul className="divide-y divide-[var(--card-border)]">
          {events.map((ev) => (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectEvent(ev);
                  onClose();
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-[var(--sidebar-hover)] transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 h-2 w-2 rounded-full shrink-0"
                    style={{ background: calendarEventColor(ev) }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-heading truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-body-muted">
                      {formatEventClock(ev.start_time, timeZone)}
                      {" – "}
                      {formatEventClock(ev.end_time, timeZone)}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
