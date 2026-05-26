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

export type LocationType =
  | "physical"
  | "zoom"
  | "google_meet"
  | "teams"
  | "other";

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
    value: "zoom",
    label: "Zoom",
    color: "#38b6ff",
    placeholder: "https://zoom.us/j/...",
  },
  {
    value: "google_meet",
    label: "Google Meet",
    color: "#10b981",
    placeholder: "https://meet.google.com/...",
  },
  {
    value: "teams",
    label: "Microsoft Teams",
    color: "#7c3aed",
    placeholder: "https://teams.microsoft.com/...",
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
}): string {
  if (isAppointmentEvent(event)) return APPOINTMENT_EVENT_COLOR;
  return locationColor(event.location_type);
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

export function formatEventRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (isSameDay(s, e)) {
    return `${format(s, "MMM d, yyyy")} · ${format(s, "h:mm a")} – ${format(e, "h:mm a")}`;
  }
  return `${format(s, "MMM d, yyyy h:mm a")} – ${format(e, "MMM d, yyyy h:mm a")}`;
}

export function isUrlLocation(location?: string | null) {
  if (!location) return false;
  return /^https?:\/\//i.test(location.trim());
}
