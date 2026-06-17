"use client";

import { useState } from "react";
import { format, isSameDay, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";
import {
  calendarEventColor,
  formatEventClock,
  getMonthGrid,
  parseEventTime,
} from "@/lib/calendar/utils";
import { CalendarDayEventsPopover } from "@/components/calendar/calendar-day-events-popover";
import { useViewerTimeZone } from "@/hooks/useViewerTimeZone";
import type { CalendarEvent } from "@/types";

interface CalendarMonthViewProps {
  month: Date;
  events: CalendarEvent[];
  onSelectDate?: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

const VISIBLE_EVENT_COUNT = 3;

export function CalendarMonthView({
  month,
  events,
  onSelectDate,
  onSelectEvent,
}: CalendarMonthViewProps) {
  const timeZone = useViewerTimeZone();
  const days = getMonthGrid(month);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [expandedDay, setExpandedDay] = useState<{
    day: Date;
    events: CalendarEvent[];
    rect: DOMRect;
  } | null>(null);

  function eventsOnDay(day: Date) {
    return events
      .filter((e) => isSameDay(parseEventTime(e.start_time), day))
      .sort(
        (a, b) =>
          parseEventTime(a.start_time).getTime() -
          parseEventTime(b.start_time).getTime()
      );
  }

  return (
    <>
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
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day) => {
            const dayEvents = eventsOnDay(day);
            const inMonth = isSameMonth(day, month);
            const today = isSameDay(day, new Date());
            const visible = dayEvents.slice(0, VISIBLE_EVENT_COUNT);
            const hiddenCount = dayEvents.length - visible.length;

            const Cell = onSelectDate ? "button" : "div";

            return (
              <Cell
                key={day.toISOString()}
                {...(onSelectDate
                  ? {
                      type: "button" as const,
                      onClick: () => onSelectDate(day),
                    }
                  : {})}
                className={cn(
                  "min-h-[7.5rem] p-1.5 border-b border-r border-[var(--card-border)] text-left transition-colors flex flex-col",
                  onSelectDate && "hover:bg-[var(--sidebar-hover)]",
                  !inMonth && "bg-[var(--background)]/60 opacity-50",
                  today && "ring-1 ring-inset ring-[var(--secondary)]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium shrink-0",
                    today && "bg-[var(--primary)] text-white"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 flex-1 space-y-0.5 min-h-0">
                  {visible.map((ev) => (
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
                      className="block truncate text-[10px] leading-tight font-medium px-1 py-0.5 rounded text-white"
                      style={{
                        background: calendarEventColor(ev),
                      }}
                      title={`${formatEventClock(ev.start_time, timeZone)} · ${ev.title}`}
                    >
                      <span className="opacity-90">
                        {formatEventClock(ev.start_time, timeZone)}
                      </span>{" "}
                      {ev.title}
                    </span>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (
                          e.currentTarget as HTMLButtonElement
                        ).getBoundingClientRect();
                        setExpandedDay({ day, events: dayEvents, rect });
                      }}
                      className="text-[10px] font-medium text-[var(--primary)] hover:underline px-1 text-left"
                    >
                      +{hiddenCount} more
                    </button>
                  )}
                </div>
              </Cell>
            );
          })}
        </div>
      </div>

      {expandedDay && (
        <CalendarDayEventsPopover
          day={expandedDay.day}
          events={expandedDay.events}
          anchorRect={expandedDay.rect}
          timeZone={timeZone}
          onClose={() => setExpandedDay(null)}
          onSelectEvent={onSelectEvent}
        />
      )}
    </>
  );
}
