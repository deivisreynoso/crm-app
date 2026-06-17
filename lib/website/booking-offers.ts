import {
  fetchBusyIntervalsForRange,
  formatOfferSlotLabel,
  getAvailableSlotStartsInRange,
  pickBookingOffers,
  type BookingOffer,
} from "@/lib/website/booking-slots-core";
import {
  getBookingAvailabilityForWebsite,
  type BookingAvailabilityConfig,
} from "@/lib/website/booking-availability";

export type { BookingOffer };

export type BookingOffersResult = {
  timezone: string;
  timezone_label: string;
  meeting_duration_minutes: number;
  buffer_minutes: number;
  /** Booking window for self-serve date/time pickers (onboarding, website). */
  availability: {
    days: number[];
    start_time: string;
    end_time: string;
    min_notice_hours: number;
    max_days_ahead: number;
  };
  /** ISO start times — store in N8N session as `available_slots` (GHL parity) */
  available_slots: string[];
  offers: BookingOffer[];
  /** Pre-formatted WhatsApp-style message (GHL "Format Available Slots" parity) */
  message: string;
  next_action: "book_call";
  reschedule: boolean;
  count: number;
};

function timezoneLabel(config: BookingAvailabilityConfig, lang: "es" | "en") {
  const tz = config.timezone.replace(/_/g, " ");
  if (lang === "es") {
    if (config.timezone === "America/Mexico_City") return "hora Ciudad de México";
    return `hora ${tz}`;
  }
  return tz;
}

function buildOffersMessage(
  offers: BookingOffer[],
  config: BookingAvailabilityConfig,
  lang: "es" | "en",
  reschedule: boolean
): string {
  if (offers.length === 0) {
    return lang === "es"
      ? "No encontré horarios disponibles en este periodo. Alguien del equipo te contactará para coordinar."
      : "No available times in this period. Our team will reach out to coordinate.";
  }

  const intro = reschedule
    ? lang === "es"
      ? "Claro, aquí tienes más opciones disponibles:\n\n"
      : "Sure, here are more available options:\n\n"
    : lang === "es"
      ? "Aquí tienes opciones reales del calendario:\n\n"
      : "Here are real calendar options:\n\n";

  const lines = offers.map((o) => `${o.index}) ${o.label}`);
  const tzLabel = timezoneLabel(config, lang);

  const footer =
    lang === "es"
      ? `\n\nZona horaria: ${tzLabel}.\n\nResponde con el número de tu opción, o dime si prefieres otro día.`
      : `\n\nTimezone: ${tzLabel}.\n\nReply with your option number, or tell us if you prefer another day.`;

  return intro + lines.join("\n") + footer;
}

/** GHL getFreeSlots + Format Available Slots — multi-day numbered offers for N8N / WhatsApp. */
export async function getBookingOffers(input: {
  lang?: "es" | "en";
  /** 3 for first offer, 6 for reschedule (GHL default) */
  limit?: number;
  reschedule?: boolean;
  workspaceOwnerId?: string;
  now?: Date;
}): Promise<BookingOffersResult> {
  const lang = input.lang === "en" ? "en" : "es";
  const reschedule = input.reschedule ?? false;
  const limit = input.limit ?? (reschedule ? 6 : 3);
  const ownerId =
    input.workspaceOwnerId?.trim() || process.env.WEBSITE_LEADS_USER_ID?.trim();
  if (!ownerId) {
    throw new Error("WEBSITE_LEADS_USER_ID is not configured.");
  }

  const config = await getBookingAvailabilityForWebsite();
  const now = input.now ?? new Date();
  const minStart = new Date(now.getTime() + config.min_notice_hours * 3_600_000);
  const maxEnd = new Date(
    now.getTime() + config.max_days_ahead * 24 * 3_600_000
  );

  const busy = await fetchBusyIntervalsForRange(ownerId, minStart, maxEnd);
  const candidates = getAvailableSlotStartsInRange(config, busy, minStart, maxEnd, now);
  const offers = pickBookingOffers(candidates, config, lang, limit);

  const available_slots = offers.map((o) => o.start);
  const message = buildOffersMessage(offers, config, lang, reschedule);

  return {
    timezone: config.timezone,
    timezone_label: timezoneLabel(config, lang),
    meeting_duration_minutes: config.meeting_duration_minutes,
    buffer_minutes: config.buffer_minutes,
    availability: {
      days: config.days,
      start_time: config.start_time,
      end_time: config.end_time,
      min_notice_hours: config.min_notice_hours,
      max_days_ahead: config.max_days_ahead,
    },
    available_slots,
    offers,
    message,
    next_action: "book_call",
    reschedule,
    count: offers.length,
  };
}
