import type { SupabaseClient } from "@supabase/supabase-js";
import type { GoogleCalendarAttendee } from "@/lib/google/calendar";
import type { AttendeeEmail } from "@/lib/calendar/event-attendees";

type ContactAttendee = { email: string; displayName?: string };

/**
 * Google Calendar guests for a CRM event.
 * - Primary contact + additional attendees are always invited.
 * - When sync runs on another user's calendar, the Owner (assigned_to) is invited too.
 * - The sync user's own email is omitted (avoids organizer self-invite conflicts).
 */
export async function buildGoogleSyncAttendees(
  supabase: SupabaseClient,
  input: {
    syncUserId: string;
    assigneeId: string | null | undefined;
    primaryContact: ContactAttendee | null;
    extraAttendees: AttendeeEmail[];
  }
): Promise<GoogleCalendarAttendee[]> {
  const byEmail = new Map<string, GoogleCalendarAttendee>();

  const add = (email: string, displayName?: string) => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, { email: trimmed, displayName });
    }
  };

  if (input.primaryContact) {
    add(input.primaryContact.email, input.primaryContact.displayName);
  }

  for (const attendee of input.extraAttendees) {
    add(attendee.email, attendee.name);
  }

  const assigneeId = input.assigneeId?.trim();
  if (assigneeId && assigneeId !== input.syncUserId) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email, display_name")
      .eq("id", assigneeId)
      .maybeSingle();
    const email = (profile?.email as string | null)?.trim();
    if (email) {
      add(email, (profile?.display_name as string | null) ?? undefined);
    }
  }

  const { data: syncProfile } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("id", input.syncUserId)
    .maybeSingle();
  const syncEmail = (syncProfile?.email as string | null)?.trim().toLowerCase();
  if (syncEmail) {
    byEmail.delete(syncEmail);
  }

  return [...byEmail.values()];
}
