import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/types";

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

  return events.map((row) => {
    const assignedTo = row.assigned_to as string | null | undefined;
    const profile = assignedTo ? profileMap.get(assignedTo) : undefined;
    return {
      ...(row as unknown as CalendarEvent),
      owner_name: profile?.display_name ?? null,
      owner_color: profile?.calendar_color ?? null,
    };
  });
}
