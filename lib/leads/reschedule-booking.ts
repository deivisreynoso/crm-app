import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createBookingCalendarEvent,
  updateBookingCalendarEvent,
  type WebsiteCalendarSelection,
} from "@/lib/leads/booking-calendar-event";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import {
  getBookingAvailabilityForWebsite,
  slotToDate,
} from "@/lib/website/booking-availability";
import { syncBookingToGoogleCalendar } from "@/lib/leads/booking-google-sync";
import { formatBookingSlotLabel } from "@/lib/leads/format-booking-label";
import { sendAppointmentConfirmationEmail } from "@/lib/leads/appointment-confirmation-email";
import type { CrmLocale } from "@/lib/crm/i18n";

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

function bookingWindow(
  calendar: WebsiteCalendarSelection,
  config: Awaited<ReturnType<typeof getBookingAvailabilityForWebsite>>
) {
  const normalizedTime =
    calendar.time.length >= 5 ? calendar.time.slice(0, 5) : calendar.time;
  const start = slotToDate(calendar.date, normalizedTime, config.timezone);
  const end = new Date(start.getTime() + config.meeting_duration_minutes * 60_000);
  return { start, end };
}

async function afterBookingCreated(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: {
    eventId: string;
    contactName: string;
    company?: string | null;
    calendar: WebsiteCalendarSelection;
    config: Awaited<ReturnType<typeof getBookingAvailabilityForWebsite>>;
    assigneeId?: string | null;
    leadEmail?: string | null;
    locale?: CrmLocale;
    reschedule?: boolean;
  }
) {
  const { start, end } = bookingWindow(input.calendar, input.config);
  const label = input.company?.trim() || input.contactName.trim();
  const tz =
    input.calendar.timezone?.trim() || input.config.timezone.replace(/_/g, " ");
  const title = `Discovery call — ${label}`;
  const description = input.reschedule
    ? `Rescheduled via website (${tz}).`
    : `Booked via website (${tz}).`;

  const sync = await syncBookingToGoogleCalendar(supabase, {
    workspaceOwnerId,
    assigneeId: input.assigneeId ?? null,
    eventId: input.eventId,
    title,
    description,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  });

  const email = input.leadEmail?.trim();
  if (email) {
    const locale: CrmLocale = input.locale === "en" ? "en" : "es";
    await sendAppointmentConfirmationEmail({
      to: email,
      locale,
      name: input.contactName,
      slotLabel: formatBookingSlotLabel(start.toISOString(), input.config.timezone, locale),
      timezone: input.config.timezone,
      meetLink: sync.meetLink,
      reschedule: input.reschedule,
    });
  }
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
    assigneeId?: string | null;
    leadEmail?: string | null;
    locale?: CrmLocale;
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

      await afterBookingCreated(supabase, workspaceOwnerId, {
        eventId,
        contactName: input.contactName,
        company: input.company,
        calendar: input.calendar,
        config,
        assigneeId: input.assigneeId,
        leadEmail: input.leadEmail,
        locale: input.locale,
        reschedule: true,
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

  await afterBookingCreated(supabase, workspaceOwnerId, {
    eventId,
    contactName: input.contactName,
    company: input.company,
    calendar: input.calendar,
    config,
    assigneeId: input.assigneeId,
    leadEmail: input.leadEmail,
    locale: input.locale,
    reschedule: false,
  });

  return eventId;
}
