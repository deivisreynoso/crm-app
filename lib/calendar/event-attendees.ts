import type { SupabaseClient } from "@supabase/supabase-js";

export type CalendarAttendeeInput = {
  additional_users?: string[];
  additional_contacts?: string[];
};

export type CalendarAttendeeRow = {
  id: string;
  attendee_type: "user" | "contact";
  user_id: string | null;
  contact_id: string | null;
};

export async function upsertCalendarEventAttendees(
  supabase: SupabaseClient,
  calendarEventId: string,
  input: CalendarAttendeeInput,
  options?: { primaryUserId?: string | null; primaryContactId?: string | null }
): Promise<void> {
  const userIds = new Set(
    (input.additional_users ?? []).filter(
      (id) => id && id !== options?.primaryUserId
    )
  );
  const contactIds = new Set(
    (input.additional_contacts ?? []).filter(
      (id) => id && id !== options?.primaryContactId
    )
  );

  await supabase
    .from("calendar_event_attendees")
    .delete()
    .eq("calendar_event_id", calendarEventId);

  const rows: {
    calendar_event_id: string;
    attendee_type: "user" | "contact";
    user_id?: string;
    contact_id?: string;
  }[] = [];

  for (const userId of userIds) {
    rows.push({
      calendar_event_id: calendarEventId,
      attendee_type: "user",
      user_id: userId,
    });
  }
  for (const contactId of contactIds) {
    rows.push({
      calendar_event_id: calendarEventId,
      attendee_type: "contact",
      contact_id: contactId,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("calendar_event_attendees").insert(rows);
    if (error) {
      console.error("upsertCalendarEventAttendees:", error.message);
    }
  }
}

export async function listCalendarEventAttendees(
  supabase: SupabaseClient,
  calendarEventId: string
): Promise<CalendarAttendeeRow[]> {
  const { data } = await supabase
    .from("calendar_event_attendees")
    .select("id, attendee_type, user_id, contact_id")
    .eq("calendar_event_id", calendarEventId);

  return (data ?? []) as CalendarAttendeeRow[];
}

export type AttendeeEmail = { email: string; name?: string };

export async function resolveAttendeeEmails(
  supabase: SupabaseClient,
  attendees: CalendarAttendeeRow[]
): Promise<AttendeeEmail[]> {
  const emails: AttendeeEmail[] = [];
  const userIds = attendees
    .filter((a) => a.attendee_type === "user" && a.user_id)
    .map((a) => a.user_id as string);
  const contactIds = attendees
    .filter((a) => a.attendee_type === "contact" && a.contact_id)
    .map((a) => a.contact_id as string);

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email, display_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      const email = (p.email as string | null)?.trim();
      if (email) {
        emails.push({
          email,
          name: (p.display_name as string | null) ?? undefined,
        });
      }
    }
  }

  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, email, first_name, last_name")
      .in("id", contactIds);
    for (const c of contacts ?? []) {
      const email = (c.email as string | null)?.trim();
      if (email) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
        emails.push({ email, name: name || undefined });
      }
    }
  }

  return emails;
}

export type AdditionalContactReminder = {
  name: string;
  email: string;
  phone: string;
  preferred_language: string;
};

export async function resolveAdditionalContactsForWebhook(
  supabase: SupabaseClient,
  calendarEventId: string,
  primaryContactId?: string | null
): Promise<AdditionalContactReminder[]> {
  const attendees = await listCalendarEventAttendees(supabase, calendarEventId);
  const contactIds = attendees
    .filter((a) => a.attendee_type === "contact" && a.contact_id !== primaryContactId)
    .map((a) => a.contact_id as string);

  if (contactIds.length === 0) return [];

  const { data: contacts } = await supabase
    .from("contacts")
    .select("first_name, last_name, email, phone, preferred_language")
    .in("id", contactIds);

  return (contacts ?? [])
    .filter((c) => (c.email as string | null)?.trim())
    .map((c) => ({
      name: [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "there",
      email: (c.email as string).trim(),
      phone: (c.phone as string | null)?.trim() ?? "",
      preferred_language: (c.preferred_language as string | null) === "en" ? "en" : "es",
    }));
}
