import { getGoogleCalendarAccessToken } from "@/lib/google/calendar";

/** Pick a user id with a working Google Calendar connection (assignee → actor → workspace owner). */
export async function resolveCalendarUserId(
  _supabase: unknown,
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

    const accessToken = await getGoogleCalendarAccessToken(id);
    if (accessToken) return id;
  }

  return candidates[0] ?? workspaceOwnerId;
}
