import { createLeadFromWebsite, type WebsiteQualification } from "@/lib/leads/website-leads";
import type { WebsiteLeadSource } from "@/lib/notifications/sales-group-events";
import type { WebsiteContactInfo } from "@/lib/leads/website-leads";
import {
  getBookingAvailabilityForWebsite,
  isBookingSlotAvailable,
} from "@/lib/website/booking-availability";
import { isoToWallClock } from "@/lib/website/booking-slots-core";
import { getClickIn360OrgUserId } from "@/lib/org/constants";

export type BookDiscoveryCallInput = {
  contact_info: WebsiteContactInfo;
  qualification?: WebsiteQualification;
  slot_start: string;
  conversation_transcript?: string | null;
  source?: WebsiteLeadSource;
  ga_client_id?: string | null;
  reschedule?: boolean;
};

export type BookDiscoveryCallResult = {
  contact_id: string;
  opportunity_id: string | null;
  calendar_event_id: string | null;
  assigned_to: string | null;
  returning_visitor: boolean;
  slot_start: string;
  slot_label: string;
  timezone: string;
};

function formatConfirmationLabel(iso: string, timeZone: string, lang: "es" | "en") {
  const d = new Date(iso);
  const locale = lang === "es" ? "es-MX" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

/** Create/update lead + CRM calendar event for a discovery call (GHL book appointment parity). */
export async function bookDiscoveryCall(
  input: BookDiscoveryCallInput,
  options?: { lang?: "es" | "en" }
): Promise<BookDiscoveryCallResult> {
  const lang = options?.lang === "en" ? "en" : "es";
  const ownerId = getClickIn360OrgUserId();

  const slotStart = new Date(input.slot_start);
  if (Number.isNaN(slotStart.getTime())) {
    throw new Error("Invalid slot_start.");
  }

  const config = await getBookingAvailabilityForWebsite();
  const { date, time } = isoToWallClock(input.slot_start, config.timezone);

  const slotCheck = await isBookingSlotAvailable(
    date,
    time,
    config,
    ownerId
  );
  if (!slotCheck.ok) {
    const err = new Error(slotCheck.message) as Error & { code?: string };
    err.code = slotCheck.code;
    throw err;
  }

  const source: WebsiteLeadSource =
    input.source === "whatsapp"
      ? "whatsapp"
      : input.source === "form"
        ? "form"
        : "webchat";

  const lead = await createLeadFromWebsite({
    source,
    contact_info: input.contact_info,
    qualification: {
      ...input.qualification,
      ai_summary:
        input.qualification?.ai_summary ??
        `Discovery call booked: ${date} ${time} (${config.timezone})`,
    },
    calendar_selection: {
      date,
      time,
      timezone: config.timezone,
    },
    conversation_transcript: input.conversation_transcript ?? null,
    ga_client_id: input.ga_client_id ?? null,
    language: options?.lang ?? "es",
    reschedule: input.reschedule ?? false,
  });

  return {
    ...lead,
    slot_start: slotStart.toISOString(),
    slot_label: formatConfirmationLabel(slotStart.toISOString(), config.timezone, lang),
    timezone: config.timezone,
  };
}
