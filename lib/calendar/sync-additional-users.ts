import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getGoogleCalendarAccessToken,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  type GoogleCalendarEventInput,
} from "@/lib/google/calendar";

type EventDetails = Omit<GoogleCalendarEventInput, "attendees" | "addGoogleMeet">;

/**
 * After creating the primary event: directly create a copy in each additional
 * team member's Google Calendar if they have Calendar connected to the CRM.
 * Stores the resulting google_event_id on the attendees row so updates and
 * deletes can be propagated later.
 */
export async function syncEventToAdditionalUsers(
  supabase: SupabaseClient,
  calendarEventId: string,
  additionalUserIds: string[],
  primarySyncUserId: string | null,
  event: EventDetails
): Promise<void> {
  for (const userId of additionalUserIds) {
    if (userId === primarySyncUserId) continue;
    const token = await getGoogleCalendarAccessToken(userId);
    if (!token) continue;
    try {
      const result = await createGoogleCalendarEvent(userId, event);
      if (!result.eventId) continue;
      await supabase
        .from("calendar_event_attendees")
        .update({ google_event_id: result.eventId })
        .eq("calendar_event_id", calendarEventId)
        .eq("user_id", userId)
        .eq("attendee_type", "user");
    } catch (err) {
      console.error(`syncEventToAdditionalUsers: failed for user ${userId}:`, err);
    }
  }
}

/**
 * Read the current google_event_id stored per team-member attendee row.
 * Call this BEFORE upsertCalendarEventAttendees wipes the attendees table.
 */
export async function readAttendeeGoogleEventIds(
  supabase: SupabaseClient,
  calendarEventId: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("calendar_event_attendees")
    .select("user_id, google_event_id")
    .eq("calendar_event_id", calendarEventId)
    .eq("attendee_type", "user")
    .not("google_event_id", "is", null);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const uid = row.user_id as string | null;
    const gid = row.google_event_id as string | null;
    if (uid && gid) map.set(uid, gid);
  }
  return map;
}

/**
 * After an attendee upsert (which clears and re-inserts rows): reconcile each
 * additional team member's Google Calendar copy.
 * - Removed attendees  → their calendar event is deleted
 * - Kept attendees     → their calendar event is updated; google_event_id restored
 * - New attendees      → calendar event created if they have Calendar connected
 */
export async function reconcileAdditionalUserCalendars(
  supabase: SupabaseClient,
  calendarEventId: string,
  currentUserIds: string[],
  previousGoogleEventIds: Map<string, string>,
  primarySyncUserId: string | null,
  event: EventDetails
): Promise<void> {
  const currentSet = new Set(currentUserIds);

  // Delete events for attendees that were removed
  for (const [userId, googleEventId] of previousGoogleEventIds) {
    if (currentSet.has(userId)) continue;
    try {
      await deleteGoogleCalendarEvent(userId, googleEventId);
    } catch (err) {
      console.error(`reconcileAdditionalUserCalendars: delete failed for ${userId}:`, err);
    }
  }

  // Create or update events for current attendees
  for (const userId of currentUserIds) {
    if (userId === primarySyncUserId) continue;
    const existingEventId = previousGoogleEventIds.get(userId);
    try {
      if (existingEventId) {
        // Kept attendee: update their event and restore the stored ID
        await updateGoogleCalendarEvent(userId, existingEventId, event);
        await supabase
          .from("calendar_event_attendees")
          .update({ google_event_id: existingEventId })
          .eq("calendar_event_id", calendarEventId)
          .eq("user_id", userId)
          .eq("attendee_type", "user");
      } else {
        // New attendee: create event if they have Calendar connected
        const token = await getGoogleCalendarAccessToken(userId);
        if (!token) continue;
        const result = await createGoogleCalendarEvent(userId, event);
        if (!result.eventId) continue;
        await supabase
          .from("calendar_event_attendees")
          .update({ google_event_id: result.eventId })
          .eq("calendar_event_id", calendarEventId)
          .eq("user_id", userId)
          .eq("attendee_type", "user");
      }
    } catch (err) {
      console.error(`reconcileAdditionalUserCalendars: failed for user ${userId}:`, err);
    }
  }
}

/**
 * After updating the primary event (and attendees did NOT change):
 * push the same changes to each additional team member's calendar copy.
 */
export async function updateAdditionalUserCalendars(
  supabase: SupabaseClient,
  calendarEventId: string,
  event: EventDetails
): Promise<void> {
  const { data } = await supabase
    .from("calendar_event_attendees")
    .select("user_id, google_event_id")
    .eq("calendar_event_id", calendarEventId)
    .eq("attendee_type", "user")
    .not("google_event_id", "is", null);

  for (const row of data ?? []) {
    const userId = row.user_id as string | null;
    const googleEventId = row.google_event_id as string | null;
    if (!userId || !googleEventId) continue;
    try {
      await updateGoogleCalendarEvent(userId, googleEventId, event);
    } catch (err) {
      console.error(`updateAdditionalUserCalendars: failed for user ${userId}:`, err);
    }
  }
}

/**
 * Before deleting the calendar event (and the attendees rows cascade):
 * delete each additional team member's calendar copy.
 */
export async function deleteAdditionalUserCalendars(
  supabase: SupabaseClient,
  calendarEventId: string
): Promise<void> {
  const { data } = await supabase
    .from("calendar_event_attendees")
    .select("user_id, google_event_id")
    .eq("calendar_event_id", calendarEventId)
    .eq("attendee_type", "user")
    .not("google_event_id", "is", null);

  for (const row of data ?? []) {
    const userId = row.user_id as string | null;
    const googleEventId = row.google_event_id as string | null;
    if (!userId || !googleEventId) continue;
    try {
      await deleteGoogleCalendarEvent(userId, googleEventId);
    } catch (err) {
      console.error(`deleteAdditionalUserCalendars: failed for user ${userId}:`, err);
    }
  }
}
