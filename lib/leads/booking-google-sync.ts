import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  type GoogleCalendarAttendee,
} from "@/lib/google/calendar";
import {
  getWorkspaceGroupEmails,
  listSalesGroupMemberIds,
} from "@/lib/notifications/workspace-groups";

export type BookingGoogleSyncResult = {
  googleEventId: string | null;
  meetLink: string | null;
  syncUserId: string | null;
};

async function salesGroupCalendarAttendees(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  organizerUserId: string
): Promise<GoogleCalendarAttendee[]> {
  const [{ sales }, memberIds] = await Promise.all([
    getWorkspaceGroupEmails(supabase, workspaceOwnerId),
    listSalesGroupMemberIds(supabase, workspaceOwnerId),
  ]);

  const emails = new Set<string>();
  if (sales) emails.add(sales.toLowerCase());

  const others = memberIds.filter((id) => id !== organizerUserId);
  if (others.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email, display_name")
      .in("id", others);

    for (const profile of profiles ?? []) {
      const email = (profile.email as string | null)?.trim();
      if (email) {
        emails.add(email.toLowerCase());
      }
    }
  }

  return [...emails].map((email) => ({ email }));
}

async function resolveSalesCalendarOrganizer(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<string | null> {
  const memberIds = await listSalesGroupMemberIds(supabase, workspaceOwnerId);

  for (const userId of memberIds) {
    const { data: token } = await supabase
      .from("google_calendar_tokens")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (token?.user_id) return userId;
  }

  return null;
}

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
  const syncUserId =
    (await resolveSalesCalendarOrganizer(supabase, input.workspaceOwnerId)) ??
    input.workspaceOwnerId;

  const attendees = await salesGroupCalendarAttendees(
    supabase,
    input.workspaceOwnerId,
    syncUserId
  );

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
          attendees,
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
          assigned_to: null,
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
      attendees,
    });

    if (!created.eventId && !created.meetLink) {
      return { googleEventId: null, meetLink: null, syncUserId: null };
    }

    const patch: Record<string, unknown> = {
      assigned_to: null,
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
