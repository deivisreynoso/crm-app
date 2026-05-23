"use client";

import { format, isSameDay, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { getMonthGrid, locationColor } from "@/lib/calendar/utils";
import type { CalendarEvent } from "@/types";

interface CalendarMonthViewProps {
  month: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function CalendarMonthView({
  month,
  events,
  onSelectDate,
  onSelectEvent,
}: CalendarMonthViewProps) {
  const days = getMonthGrid(month);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function eventsOnDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.start_time), day));
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[var(--card-border)] bg-[var(--background)]">
        {weekdays.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold uppercase text-body-muted"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsOnDay(day);
          const inMonth = isSameMonth(day, month);
          const today = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "min-h-[88px] p-1.5 border-b border-r border-[var(--card-border)] text-left transition-colors hover:bg-[var(--sidebar-hover)]",
                !inMonth && "bg-[var(--background)]/60 opacity-50",
                today && "ring-1 ring-inset ring-[var(--secondary)]"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  today && "bg-[var(--primary)] text-white"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((ev) => (
                  <span
                    key={ev.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }
                    }}
                    className="block truncate text-[10px] font-medium px-1 py-0.5 rounded text-white"
                    style={{
                      background: locationColor(ev.location_type),
                    }}
                  >
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-body-muted px-1">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
