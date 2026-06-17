import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSideClient } from "@/lib/supabase";
import { resolveSlotStart } from "@/lib/website/booking-slots-core";
import { getBookingAvailabilityForWebsite } from "@/lib/website/booking-availability";
import { createGoogleCalendarEvent } from "@/lib/google/calendar";
import { notifyAppointmentEvent } from "@/lib/webhooks/notify-events";
import { upsertCalendarEventAttendees } from "@/lib/calendar/event-attendees";
import {
  listSalesGroupMemberIds,
  notifySalesGroupInApp,
} from "@/lib/notifications/workspace-groups";

const bodySchema = z.object({
  token: z.string().min(1),
  slot_start: z.string().optional(),
  slot_index: z.coerce.number().int().min(1).max(12).optional(),
  offered_slots: z.array(z.string()).optional(),
});

/**
 * Book customer kickoff meeting after onboarding questionnaire.
 * POST /api/customer/bookings
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, user_id, first_name, last_name, email, preferred_language")
      .eq("onboarding_token", parsed.data.token.trim())
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const slotStart = resolveSlotStart({
      slot_start: parsed.data.slot_start,
      slot_index: parsed.data.slot_index,
      offered_slots: parsed.data.offered_slots,
    });

    if (!slotStart) {
      return NextResponse.json({ error: "Missing or invalid slot" }, { status: 400 });
    }

    const workspaceOwnerId = contact.user_id as string;
    const config = await getBookingAvailabilityForWebsite();
    const durationMs = config.meeting_duration_minutes * 60_000;
    const endTime = new Date(new Date(slotStart).getTime() + durationMs).toISOString();

    const lang = contact.preferred_language === "en" ? "en" : "es";
    const title =
      lang === "es"
        ? `Reunión de inicio — ${[contact.first_name, contact.last_name].filter(Boolean).join(" ")}`
        : `Project kickoff — ${[contact.first_name, contact.last_name].filter(Boolean).join(" ")}`;

    const { data: settings } = await supabase
      .from("user_settings")
      .select("default_sales_assignee")
      .eq("user_id", workspaceOwnerId)
      .maybeSingle();

    const assigneeId =
      (settings?.default_sales_assignee as string | null)?.trim() || workspaceOwnerId;

    const { data: event, error: insertError } = await supabase
      .from("calendar_events")
      .insert([
        {
          user_id: workspaceOwnerId,
          contact_id: contact.id,
          assigned_to: assigneeId,
          title,
          description:
            lang === "es"
              ? "Reunión de inicio agendada desde cuestionario de onboarding"
              : "Kickoff meeting booked from onboarding questionnaire",
          start_time: slotStart,
          end_time: endTime,
          location_type: "google_meet",
          event_kind: "customer_meeting",
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError || !event) {
      return NextResponse.json(
        { error: insertError?.message ?? "Could not create event" },
        { status: 500 }
      );
    }

    const salesMemberIds = await listSalesGroupMemberIds(supabase, workspaceOwnerId);
    const additionalUsers = salesMemberIds.filter((id) => id !== assigneeId);
    if (additionalUsers.length > 0) {
      await upsertCalendarEventAttendees(
        supabase,
        event.id as string,
        { additional_users: additionalUsers },
        { primaryUserId: assigneeId, primaryContactId: contact.id as string }
      );
    }

    const contactName = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Customer";

    void notifySalesGroupInApp(supabase, workspaceOwnerId, {
      kind: "sales_website_lead",
      title:
        lang === "es"
          ? `Kickoff de onboarding agendado — ${contactName}`
          : `Onboarding kickoff booked — ${contactName}`,
      message: contactName,
      related_entity_type: "contact",
      related_entity_id: contact.id as string,
    });

    let meetLink: string | null = null;
    try {
      const google = await createGoogleCalendarEvent(assigneeId, {
        title,
        description: event.description as string,
        start_time: slotStart,
        end_time: endTime,
        addGoogleMeet: true,
        attendees: contact.email
          ? [{ email: contact.email as string, displayName: contactName || undefined }]
          : undefined,
      });
      meetLink = google.meetLink;
      if (google.eventId || meetLink) {
        await supabase
          .from("calendar_events")
          .update({
            google_event_id: google.eventId,
            google_sync_user_id: assigneeId,
            is_synced: Boolean(google.eventId),
            location: meetLink,
            location_type: "google_meet",
            updated_at: new Date().toISOString(),
          })
          .eq("id", event.id);
      }
    } catch (syncErr) {
      console.error("customer booking Google sync:", syncErr);
    }

    const { data: syncedEvent } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", event.id)
      .maybeSingle();

    void notifyAppointmentEvent(
      supabase,
      workspaceOwnerId,
      "appointment.created",
      (syncedEvent ?? event) as Record<string, unknown>
    );

    return NextResponse.json({
      success: true,
      event_id: event.id,
      start_time: slotStart,
      end_time: endTime,
      meet_link: meetLink,
    });
  } catch (err) {
    console.error("POST /api/customer/bookings:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
