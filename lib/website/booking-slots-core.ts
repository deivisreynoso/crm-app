import {
  generateSlotTimes,
  getWeekdayInZone,
  isSlotBlockedByCalendar,
  slotToDate,
  validateBookingSlot,
  type BookingAvailabilityConfig,
  type BusyInterval,
} from "@/lib/website/booking-availability";
import { createServerSideClient } from "@/lib/supabase";

export type BookingOffer = {
  index: number;
  start: string;
  date: string;
  time: string;
  label: string;
};

export function getZonedDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isoToWallClock(iso: string, timeZone: string): { date: string; time: string } {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

export function formatOfferSlotLabel(iso: string, lang: "es" | "en", timeZone: string): string {
  const d = new Date(iso);
  const locale = lang === "es" ? "es-MX" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

export async function fetchBusyIntervalsForRange(
  workspaceOwnerId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<BusyInterval[]> {
  const supabase = createServerSideClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("start_time, end_time")
    .eq("user_id", workspaceOwnerId)
    .lt("start_time", rangeEnd.toISOString())
    .gt("end_time", rangeStart.toISOString());

  if (error) {
    console.error("fetchBusyIntervalsForRange:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    start: new Date(row.start_time as string),
    end: new Date(row.end_time as string),
  }));
}

function eachDateInRange(minDate: Date, maxDate: Date, timeZone: string): string[] {
  const dates: string[] = [];
  let cursor = getZonedDateKey(minDate, timeZone);
  const endKey = getZonedDateKey(maxDate, timeZone);

  while (dates.length < 400) {
    dates.push(cursor);
    if (cursor >= endKey) break;
    const [y, m, d] = cursor.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
    cursor = getZonedDateKey(next, timeZone);
  }

  return dates;
}

/** All valid slot start instants in range (availability rules + CRM calendar busy). */
export function getAvailableSlotStartsInRange(
  config: BookingAvailabilityConfig,
  busy: BusyInterval[],
  rangeStart: Date,
  rangeEnd: Date,
  now = new Date()
): string[] {
  const dates = eachDateInRange(rangeStart, rangeEnd, config.timezone);
  const starts: string[] = [];

  for (const date of dates) {
    if (!config.days.includes(getWeekdayInZone(date, config.timezone))) continue;

    for (const time of generateSlotTimes(config)) {
      const check = validateBookingSlot(date, time, config, now);
      if (!check.ok) continue;

      const slotStart = slotToDate(date, time, config.timezone);
      if (slotStart.getTime() < rangeStart.getTime()) continue;
      if (slotStart.getTime() > rangeEnd.getTime()) continue;
      if (isSlotBlockedByCalendar(slotStart, config, busy)) continue;

      starts.push(slotStart.toISOString());
    }
  }

  starts.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return starts;
}

/** Pick up to `limit` slots, preferring different calendar days (GHL Format Available Slots). */
export function pickBookingOffers(
  slotStarts: string[],
  config: BookingAvailabilityConfig,
  lang: "es" | "en",
  limit: number
): BookingOffer[] {
  const selected: string[] = [];
  const usedDays = new Set<string>();

  for (const iso of slotStarts) {
    const dayKey = getZonedDateKey(new Date(iso), config.timezone);
    if (usedDays.has(dayKey)) continue;
    selected.push(iso);
    usedDays.add(dayKey);
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    for (const iso of slotStarts) {
      if (selected.includes(iso)) continue;
      selected.push(iso);
      if (selected.length >= limit) break;
    }
  }

  return selected.map((start, i) => {
    const { date, time } = isoToWallClock(start, config.timezone);
    return {
      index: i + 1,
      start,
      date,
      time: time.length >= 5 ? time.slice(0, 5) : time,
      label: formatOfferSlotLabel(start, lang, config.timezone),
    };
  });
}

export function resolveSlotStart(input: {
  slot_start?: string | null;
  slot_index?: number | null;
  offered_slots?: string[] | null;
}): string | null {
  if (input.slot_start?.trim()) {
    const d = new Date(input.slot_start.trim());
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const index = input.slot_index;
  const offered = input.offered_slots ?? [];
  if (index != null && index >= 1 && offered.length >= index) {
    const raw = offered[index - 1];
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}
