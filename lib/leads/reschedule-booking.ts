import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createBookingCalendarEvent,
  updateBookingCalendarEvent,
  type WebsiteCalendarSelection,
} from "@/lib/leads/booking-calendar-event";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { getBookingAvailabilityForWebsite } from "@/lib/website/booking-availability";

/** Find the latest website discovery appointment for a contact. */
export async function findContactDiscoveryAppointment(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  contactId: string
) {
  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, start_time, event_kind")
    .eq("user_id", workspaceOwnerId)
    .eq("contact_id", contactId)
    .order("start_time", { ascending: false })
    .limit(20);

  const rows = data ?? [];
  return (
    rows.find(
      (e) =>
        e.event_kind === "appointment" ||
        (typeof e.title === "string" && /discovery call/i.test(e.title))
    ) ?? null
  );
}

/**
 * Create or update a website booking calendar event (reschedule updates in place).
 */
export async function upsertBookingCalendarEvent(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: {
    contactId: string;
    opportunityId: string | null;
    contactName: string;
    company?: string | null;
    calendar: WebsiteCalendarSelection;
    reschedule?: boolean;
  }
): Promise<string | null> {
  if (!input.calendar?.date || !input.calendar?.time) return null;

  const config = await getBookingAvailabilityForWebsite();

  if (input.reschedule) {
    const existing = await findContactDiscoveryAppointment(
      supabase,
      workspaceOwnerId,
      input.contactId
    );
    if (existing?.id) {
      const eventId = await updateBookingCalendarEvent(
        supabase,
        workspaceOwnerId,
        existing.id as string,
        {
          contactName: input.contactName,
          company: input.company,
          calendar: input.calendar,
          config,
        }
      );

      await logContactActivity(supabase, {
        userId: workspaceOwnerId,
        contactId: input.contactId,
        type: "meeting",
        description: `Appointment rescheduled to ${input.calendar.date} ${input.calendar.time}`,
        metadata: {
          calendar_event_id: eventId,
          event_kind: "appointment",
          rescheduled: true,
        },
      });

      return eventId;
    }
  }

  const eventId = await createBookingCalendarEvent(supabase, workspaceOwnerId, {
    contactId: input.contactId,
    opportunityId: input.opportunityId,
    contactName: input.contactName,
    company: input.company,
    calendar: input.calendar,
    config,
  });

  await logContactActivity(supabase, {
    userId: workspaceOwnerId,
    contactId: input.contactId,
    type: "meeting",
    description: `Discovery call booked: ${input.calendar.date} ${input.calendar.time}`,
    metadata: {
      calendar_event_id: eventId,
      event_kind: "appointment",
    },
  });

  return eventId;
}
