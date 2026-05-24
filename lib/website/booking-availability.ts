import { createServerSideClient } from "@/lib/supabase";

export type BookingAvailabilityConfig = {
  timezone: string;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  start_time: string;
  end_time: string;
  min_notice_hours: number;
  max_days_ahead: number;
  /** Length of each discovery call */
  meeting_duration_minutes: number;
  /** Gap after each meeting before the next slot starts */
  buffer_minutes: number;
};

export type BookingSlot = {
  time: string;
  label: string;
};

export const DEFAULT_BOOKING_AVAILABILITY: BookingAvailabilityConfig = {
  timezone: "America/Mexico_City",
  days: [1, 2, 3, 4, 5],
  start_time: "09:00",
  end_time: "17:00",
  min_notice_hours: 24,
  max_days_ahead: 21,
  meeting_duration_minutes: 30,
  buffer_minutes: 15,
};

const bookingAvailabilitySchema = {
  parse(raw: unknown): BookingAvailabilityConfig {
    if (!raw || typeof raw !== "object") return DEFAULT_BOOKING_AVAILABILITY;
    const o = raw as Record<string, unknown>;
    const days = Array.isArray(o.days)
      ? o.days.filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6)
      : DEFAULT_BOOKING_AVAILABILITY.days;
    return {
      timezone:
        typeof o.timezone === "string" && o.timezone.trim()
          ? o.timezone.trim()
          : DEFAULT_BOOKING_AVAILABILITY.timezone,
      days: days.length ? days : DEFAULT_BOOKING_AVAILABILITY.days,
      start_time:
        typeof o.start_time === "string" ? o.start_time : DEFAULT_BOOKING_AVAILABILITY.start_time,
      end_time:
        typeof o.end_time === "string" ? o.end_time : DEFAULT_BOOKING_AVAILABILITY.end_time,
      min_notice_hours:
        typeof o.min_notice_hours === "number" && o.min_notice_hours >= 0
          ? o.min_notice_hours
          : DEFAULT_BOOKING_AVAILABILITY.min_notice_hours,
      max_days_ahead:
        typeof o.max_days_ahead === "number" && o.max_days_ahead >= 1
          ? o.max_days_ahead
          : DEFAULT_BOOKING_AVAILABILITY.max_days_ahead,
      meeting_duration_minutes:
        typeof o.meeting_duration_minutes === "number" &&
        o.meeting_duration_minutes >= 15 &&
        o.meeting_duration_minutes <= 120
          ? o.meeting_duration_minutes
          : DEFAULT_BOOKING_AVAILABILITY.meeting_duration_minutes,
      buffer_minutes:
        typeof o.buffer_minutes === "number" &&
        o.buffer_minutes >= 0 &&
        o.buffer_minutes <= 60
          ? o.buffer_minutes
          : DEFAULT_BOOKING_AVAILABILITY.buffer_minutes,
    };
  },
};

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getZonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    day: weekdayMap[get("weekday")] ?? 0,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export function getWeekdayInZone(dateStr: string, timeZone: string): number {
  const utc = new Date(`${dateStr}T12:00:00.000Z`);
  return getZonedParts(utc, timeZone).day;
}

/** Approximate UTC instant for wall-clock date+time in `timeZone`. */
export function slotToDate(date: string, time: string, timeZone: string): Date {
  const normalizedTime = time.length >= 5 ? time.slice(0, 5) : time;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = normalizedTime.split(":").map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm, 0);

  for (let i = 0; i < 4; i++) {
    const parts = getZonedParts(new Date(guess), timeZone);
    const diffMinutes = hh * 60 + mm - (parts.hour * 60 + parts.minute);
    guess -= diffMinutes * 60_000;
    const [py, pm, pd] = parts.dateKey.split("-").map(Number);
    if (py !== y || pm !== m || pd !== d) {
      const dayShift = d - pd;
      guess += dayShift * 24 * 3_600_000;
    }
  }

  return new Date(guess);
}

export function formatSlotLabel(time: string, lang: "es" | "en"): string {
  const [h, m] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export type SlotValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function generateSlotTimes(
  config: BookingAvailabilityConfig
): string[] {
  const times: string[] = [];
  const dayStart = parseTimeToMinutes(config.start_time);
  const dayEnd = parseTimeToMinutes(config.end_time);
  const step = config.meeting_duration_minutes + config.buffer_minutes;

  if (step <= 0) return times;

  let cursor = dayStart;
  while (cursor + config.meeting_duration_minutes <= dayEnd) {
    times.push(minutesToTime(cursor));
    cursor += step;
  }

  return times;
}

export type BusyInterval = { start: Date; end: Date };

export function isSlotBlockedByCalendar(
  slotStart: Date,
  config: BookingAvailabilityConfig,
  busy: BusyInterval[]
): boolean {
  const slotEnd = new Date(
    slotStart.getTime() + config.meeting_duration_minutes * 60_000
  );
  const bufferMs = config.buffer_minutes * 60_000;

  for (const event of busy) {
    const blockedStart = event.start.getTime() - bufferMs;
    const blockedEnd = event.end.getTime() + bufferMs;
    if (slotStart.getTime() < blockedEnd && slotEnd.getTime() > blockedStart) {
      return true;
    }
  }

  return false;
}

export async function fetchBusyIntervalsForDate(
  workspaceOwnerId: string,
  date: string,
  config: BookingAvailabilityConfig
): Promise<BusyInterval[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const dayStart = slotToDate(date, config.start_time, config.timezone);
  const dayEnd = slotToDate(date, config.end_time, config.timezone);
  if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) return [];

  const supabase = createServerSideClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("start_time, end_time")
    .eq("user_id", workspaceOwnerId)
    .lt("start_time", dayEnd.toISOString())
    .gt("end_time", dayStart.toISOString());

  if (error) {
    console.error("fetchBusyIntervalsForDate:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    start: new Date(row.start_time as string),
    end: new Date(row.end_time as string),
  }));
}

export async function getAvailableSlotsForDateWithCalendar(
  date: string,
  config: BookingAvailabilityConfig,
  lang: "es" | "en",
  workspaceOwnerId: string,
  now = new Date()
): Promise<{ slots: BookingSlot[]; unavailable_reason?: string }> {
  const base = getAvailableSlotsForDate(date, config, lang, now);
  if (base.slots.length === 0) return base;

  const busy = await fetchBusyIntervalsForDate(workspaceOwnerId, date, config);
  const slots = base.slots.filter((slot) => {
    const slotStart = slotToDate(date, slot.time, config.timezone);
    return !isSlotBlockedByCalendar(slotStart, config, busy);
  });

  return { slots };
}

export async function isBookingSlotAvailable(
  date: string,
  time: string,
  config: BookingAvailabilityConfig,
  workspaceOwnerId: string,
  now = new Date()
): Promise<SlotValidationResult> {
  const check = validateBookingSlot(date, time, config, now);
  if (!check.ok) return check;

  const slotStart = slotToDate(date, time, config.timezone);
  const busy = await fetchBusyIntervalsForDate(workspaceOwnerId, date, config);
  if (isSlotBlockedByCalendar(slotStart, config, busy)) {
    return {
      ok: false,
      code: "slot_unavailable",
      message: "This time slot is no longer available.",
    };
  }

  return { ok: true };
}

export function getAvailableSlotsForDate(
  date: string,
  config: BookingAvailabilityConfig,
  lang: "es" | "en",
  now = new Date()
): { slots: BookingSlot[]; unavailable_reason?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { slots: [], unavailable_reason: "invalid_date" };
  }

  const weekday = getWeekdayInZone(date, config.timezone);
  if (!config.days.includes(weekday)) {
    return {
      slots: [],
      unavailable_reason:
        lang === "es" ? "day_unavailable" : "day_unavailable",
    };
  }

  const candidates = generateSlotTimes(config);
  const slots: BookingSlot[] = [];

  for (const time of candidates) {
    const check = validateBookingSlot(date, time, config, now);
    if (check.ok) {
      slots.push({ time, label: formatSlotLabel(time, lang) });
    }
  }

  return { slots };
}

export function validateBookingSlot(
  date: string,
  time: string,
  config: BookingAvailabilityConfig,
  now = new Date()
): SlotValidationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, code: "invalid_date", message: "Invalid date." };
  }

  const normalizedTime = time.length >= 5 ? time.slice(0, 5) : time;
  const allowedTimes = generateSlotTimes(config);
  if (!allowedTimes.includes(normalizedTime)) {
    return {
      ok: false,
      code: "slot_unavailable",
      message: "This time slot is not available.",
    };
  }

  const slot = slotToDate(date, normalizedTime, config.timezone);
  if (Number.isNaN(slot.getTime())) {
    return { ok: false, code: "invalid_slot", message: "Invalid date or time." };
  }

  const weekday = getWeekdayInZone(date, config.timezone);
  if (!config.days.includes(weekday)) {
    return {
      ok: false,
      code: "day_unavailable",
      message: "This day is not available for calls. Please pick a weekday.",
    };
  }

  const minStart = new Date(now.getTime() + config.min_notice_hours * 3_600_000);
  if (slot.getTime() < minStart.getTime()) {
    return {
      ok: false,
      code: "too_soon",
      message: `Please book at least ${config.min_notice_hours} hours in advance.`,
    };
  }

  const maxEnd = new Date(
    now.getTime() + config.max_days_ahead * 24 * 3_600_000
  );
  if (slot.getTime() > maxEnd.getTime()) {
    return {
      ok: false,
      code: "too_far",
      message: `Please choose a date within the next ${config.max_days_ahead} days.`,
    };
  }

  return { ok: true };
}

export function formatAvailabilityHint(
  config: BookingAvailabilityConfig,
  lang: "es" | "en"
): string {
  const dayNames =
    lang === "es"
      ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = config.days
    .sort((a, b) => a - b)
    .map((d) => dayNames[d])
    .join(", ");

  if (lang === "es") {
    return `${config.meeting_duration_minutes} min por llamada · ${days} · ${config.start_time}–${config.end_time} (${config.timezone.replace(/_/g, " ")}). Anticipación mínima: ${config.min_notice_hours} h.`;
  }
  return `${config.meeting_duration_minutes}-min calls · ${days} · ${config.start_time}–${config.end_time} (${config.timezone.replace(/_/g, " ")}). Book ${config.min_notice_hours}+ hours ahead.`;
}

export async function getBookingAvailabilityForWebsite(): Promise<BookingAvailabilityConfig> {
  const ownerId = process.env.WEBSITE_LEADS_USER_ID?.trim();
  if (!ownerId) return DEFAULT_BOOKING_AVAILABILITY;

  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("user_settings")
    .select("booking_availability")
    .eq("user_id", ownerId)
    .maybeSingle();

  return bookingAvailabilitySchema.parse(data?.booking_availability);
}

export { bookingAvailabilitySchema };
