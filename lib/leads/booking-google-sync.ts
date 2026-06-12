import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from "@/lib/google/calendar";

export type BookingGoogleSyncResult = {
  googleEventId: string | null;
  meetLink: string | null;
  syncUserId: string | null;
};

/** Create or update a Google Calendar event with Meet for a website booking (best-effort). */
export async function syncBookingToGoogleCalendar(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    assigneeId: string | null;
    eventId: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
  }
): Promise<BookingGoogleSyncResult> {
  const syncUserId = input.assigneeId ?? input.workspaceOwnerId;

  const { data: existing } = await supabase
    .from("calendar_events")
    .select("google_event_id, google_sync_user_id, location, location_type")
    .eq("id", input.eventId)
    .eq("user_id", input.workspaceOwnerId)
    .maybeSingle();

  const existingMeetLink =
    existing?.location_type === "google_meet" && existing?.location
      ? String(existing.location)
      : null;

  try {
    if (existing?.google_event_id && existing?.google_sync_user_id) {
      const updated = await updateGoogleCalendarEvent(
        existing.google_sync_user_id as string,
        existing.google_event_id as string,
        {
          title: input.title,
          description: input.description,
          start_time: input.startTime,
          end_time: input.endTime,
          location: existingMeetLink ?? undefined,
        }
      );

      if (!updated) {
        return {
          googleEventId: existing.google_event_id as string,
          meetLink: existingMeetLink,
          syncUserId: existing.google_sync_user_id as string,
        };
      }

      await supabase
        .from("calendar_events")
        .update({
          assigned_to: input.assigneeId ?? input.workspaceOwnerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.eventId)
        .eq("user_id", input.workspaceOwnerId);

      return {
        googleEventId: existing.google_event_id as string,
        meetLink: existingMeetLink,
        syncUserId: existing.google_sync_user_id as string,
      };
    }

    const created = await createGoogleCalendarEvent(syncUserId, {
      title: input.title,
      description: input.description,
      start_time: input.startTime,
      end_time: input.endTime,
      addGoogleMeet: true,
    });

    if (!created.eventId && !created.meetLink) {
      return { googleEventId: null, meetLink: null, syncUserId: null };
    }

    const patch: Record<string, unknown> = {
      assigned_to: input.assigneeId ?? input.workspaceOwnerId,
      is_synced: Boolean(created.eventId),
      google_sync_user_id: created.eventId ? syncUserId : null,
      updated_at: new Date().toISOString(),
    };

    if (created.eventId) patch.google_event_id = created.eventId;
    if (created.meetLink) {
      patch.location = created.meetLink;
      patch.location_type = "google_meet";
    }

    await supabase
      .from("calendar_events")
      .update(patch)
      .eq("id", input.eventId)
      .eq("user_id", input.workspaceOwnerId);

    return {
      googleEventId: created.eventId,
      meetLink: created.meetLink,
      syncUserId: created.eventId ? syncUserId : null,
    };
  } catch (err) {
    console.error("syncBookingToGoogleCalendar:", err);
    return { googleEventId: null, meetLink: null, syncUserId: null };
  }
}
