import type { SupabaseClient } from "@supabase/supabase-js";

/** Pick a user id that has Google Calendar tokens (assignee → actor → workspace owner). */
export async function resolveCalendarUserId(
  supabase: SupabaseClient,
  preferredUserIds: Array<string | null | undefined>,
  workspaceOwnerId: string
): Promise<string> {
  const candidates = [
    ...preferredUserIds.filter((id): id is string => !!id?.trim()),
    workspaceOwnerId,
  ];

  const seen = new Set<string>();
  for (const id of candidates) {
    if (seen.has(id)) continue;
    seen.add(id);

    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("id")
      .eq("user_id", id)
      .maybeSingle();

    if (data?.id) return id;
  }

  return candidates[0] ?? workspaceOwnerId;
}
