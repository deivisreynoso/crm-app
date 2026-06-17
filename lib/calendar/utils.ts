import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { parseStoredTimestamp } from "@/lib/utils/datetime";
import { resolveCalendarOwnerColor } from "@/lib/users/calendar-colors";

export type LocationType = "physical" | "google_meet" | "other";

export const LOCATION_TYPES: {
  value: LocationType;
  label: string;
  color: string;
  placeholder: string;
}[] = [
  {
    value: "physical",
    label: "In person",
    color: "#f59e0b",
    placeholder: "Street address or meeting room",
  },
  {
    value: "google_meet",
    label: "Google Meet",
    color: "#10b981",
    placeholder: "Meet link is generated automatically",
  },
  {
    value: "other",
    label: "Other",
    color: "#6b7280",
    placeholder: "Meeting link or notes",
  },
];

export function locationColor(type?: string | null) {
  return LOCATION_TYPES.find((t) => t.value === type)?.color ?? "#6b7280";
}

/** Website / discovery-call bookings — distinct from location-based meeting colors */
export const APPOINTMENT_EVENT_COLOR = "#e11d48";

export type CalendarEventKind = "meeting" | "appointment";

export function isAppointmentEvent(event: {
  event_kind?: CalendarEventKind | string | null;
  description?: string | null;
  title?: string;
}): boolean {
  if (event.event_kind === "appointment") return true;
  if (event.event_kind === "meeting") return false;
  const desc = event.description ?? "";
  const title = event.title ?? "";
  return (
    desc.includes("Booked via website") ||
    /^Discovery call\s*[—–-]/i.test(title)
  );
}

export function calendarEventColor(event: {
  event_kind?: CalendarEventKind | string | null;
  location_type?: string | null;
  description?: string | null;
  title?: string;
  owner_color?: string | null;
  assigned_to?: string | null;
}): string {
  if (isAppointmentEvent(event)) return APPOINTMENT_EVENT_COLOR;
  return resolveCalendarOwnerColor(event.owner_color);
}

export function getMonthGrid(anchor: Date) {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function shiftMonth(anchor: Date, delta: number) {
  return addMonths(anchor, delta);
}

export function parseEventTime(value: string): Date {
  return parseStoredTimestamp(value);
}

function dateKeyInTimeZone(d: Date, timeZone?: string | null): string {
  const tz = timeZone?.trim();
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(tz ? { timeZone: tz } : {}),
  };
  try {
    return new Intl.DateTimeFormat("en-CA", opts).format(d);
  } catch {
    return format(d, "yyyy-MM-dd");
  }
}

/** Clock time for calendar chips and modals (stored UTC → viewer/workspace TZ). */
export function formatEventClock(
  value: string,
  timeZone?: string | null,
  locale = "en-US"
): string {
  const d = parseStoredTimestamp(value);
  if (Number.isNaN(d.getTime())) return "";

  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone?.trim() ? { timeZone: timeZone.trim() } : {}),
  };

  try {
    return d.toLocaleTimeString(locale, opts);
  } catch {
    return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }
}

export function formatEventRange(
  start: string,
  end: string,
  timeZone?: string | null,
  locale = "en-US"
) {
  const s = parseStoredTimestamp(start);
  const e = parseStoredTimestamp(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";

  const tz = timeZone?.trim() || undefined;
  const sameDay = dateKeyInTimeZone(s, tz) === dateKeyInTimeZone(e, tz);

  const dateLabel = (d: Date) => {
    try {
      return d.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: tz,
      });
    } catch {
      return format(d, "MMM d, yyyy");
    }
  };

  if (sameDay) {
    return `${dateLabel(s)} · ${formatEventClock(start, tz, locale)} – ${formatEventClock(end, tz, locale)}`;
  }

  return `${dateLabel(s)} ${formatEventClock(start, tz, locale)} – ${dateLabel(e)} ${formatEventClock(end, tz, locale)}`;
}

export function isUrlLocation(location?: string | null) {
  if (!location) return false;
  return /^https?:\/\//i.test(location.trim());
}
