import type { SupabaseClient } from "@supabase/supabase-js";
import { insertWithColumnFallback } from "@/lib/api/strip-insert";
import {
  slotToDate,
  type BookingAvailabilityConfig,
} from "@/lib/website/booking-availability";

export type WebsiteCalendarSelection = {
  date: string;
  time: string;
  timezone?: string | null;
};

/** CRM calendar event for a website booking (no Google Calendar sync). */
export async function createBookingCalendarEvent(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: {
    contactId: string;
    opportunityId: string | null;
    contactName: string;
    company?: string | null;
    calendar: WebsiteCalendarSelection;
    config: BookingAvailabilityConfig;
  }
): Promise<string> {
  const normalizedTime =
    input.calendar.time.length >= 5
      ? input.calendar.time.slice(0, 5)
      : input.calendar.time;
  const start = slotToDate(
    input.calendar.date,
    normalizedTime,
    input.config.timezone
  );
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid booking date or time.");
  }

  const end = new Date(
    start.getTime() + input.config.meeting_duration_minutes * 60_000
  );
  const label = input.company?.trim() || input.contactName.trim();
  const tz =
    input.calendar.timezone?.trim() || input.config.timezone.replace(/_/g, " ");

  const row = {
    user_id: workspaceOwnerId,
    contact_id: input.contactId,
    opportunity_id: input.opportunityId,
    title: `Discovery call — ${label}`,
    description: `Booked via website (${tz}).`,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    location: "Video call",
    event_kind: "appointment" as const,
    is_synced: false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await insertWithColumnFallback(
    (payload) =>
      supabase.from("calendar_events").insert([payload]).select("id").single(),
    row,
    ["event_kind", "updated_at"]
  );

  const created = data as { id?: string } | null;
  if (error || !created?.id) {
    throw new Error(error?.message ?? "Failed to create calendar event");
  }

  return created.id;
}
