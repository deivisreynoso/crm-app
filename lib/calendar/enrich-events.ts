import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent, CalendarEventAttendee } from "@/types";

export async function enrichCalendarEventsWithOwners(
  supabase: SupabaseClient,
  events: Record<string, unknown>[]
): Promise<CalendarEvent[]> {
  const assigneeIds = [
    ...new Set(
      events
        .map((e) => e.assigned_to as string | null | undefined)
        .filter((id): id is string => !!id?.trim())
    ),
  ];

  const profileMap = new Map<string, { display_name: string | null; calendar_color: string | null }>();

  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, display_name, calendar_color")
      .in("id", assigneeIds);

    for (const p of profiles ?? []) {
      profileMap.set(p.id as string, {
        display_name: (p.display_name as string | null) ?? null,
        calendar_color: (p.calendar_color as string | null) ?? null,
      });
    }
  }

  const eventIds = events.map((e) => e.id as string).filter(Boolean);
  const attendeesByEvent = new Map<string, CalendarEventAttendee[]>();

  if (eventIds.length > 0) {
    const { data: attendeeRows } = await supabase
      .from("calendar_event_attendees")
      .select("id, calendar_event_id, attendee_type, user_id, contact_id")
      .in("calendar_event_id", eventIds);

    const userIds = [
      ...new Set(
        (attendeeRows ?? [])
          .filter((a) => a.attendee_type === "user" && a.user_id)
          .map((a) => a.user_id as string)
      ),
    ];
    const contactIds = [
      ...new Set(
        (attendeeRows ?? [])
          .filter((a) => a.attendee_type === "contact" && a.contact_id)
          .map((a) => a.contact_id as string)
      ),
    ];

    const userNameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("user_profiles")
        .select("id, display_name, email")
        .in("id", userIds);
      for (const u of users ?? []) {
        userNameMap.set(
          u.id as string,
          (u.display_name as string | null) || (u.email as string | null) || "Team member"
        );
      }
    }

    const contactMap = new Map<string, { name: string; email: string | null }>();
    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email")
        .in("id", contactIds);
      for (const c of contacts ?? []) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
        contactMap.set(c.id as string, {
          name: name || (c.email as string) || "Contact",
          email: (c.email as string | null) ?? null,
        });
      }
    }

    for (const row of attendeeRows ?? []) {
      const eventId = row.calendar_event_id as string;
      const list = attendeesByEvent.get(eventId) ?? [];
      const attendee: CalendarEventAttendee = {
        id: row.id as string,
        attendee_type: row.attendee_type as "user" | "contact",
        user_id: row.user_id as string | null,
        contact_id: row.contact_id as string | null,
      };
      if (row.attendee_type === "user" && row.user_id) {
        attendee.display_name = userNameMap.get(row.user_id as string) ?? null;
      }
      if (row.attendee_type === "contact" && row.contact_id) {
        const c = contactMap.get(row.contact_id as string);
        attendee.display_name = c?.name ?? null;
        attendee.email = c?.email ?? null;
      }
      list.push(attendee);
      attendeesByEvent.set(eventId, list);
    }
  }

  return events.map((row) => {
    const assignedTo = row.assigned_to as string | null | undefined;
    const profile = assignedTo ? profileMap.get(assignedTo) : undefined;
    const id = row.id as string;
    return {
      ...(row as unknown as CalendarEvent),
      owner_name: profile?.display_name ?? null,
      owner_color: profile?.calendar_color ?? null,
      attendees: attendeesByEvent.get(id) ?? [],
    };
  });
}
