import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCalendarUserId } from "@/lib/google/resolve-calendar-user";

/**
 * Google Calendar user for sync operations.
 * New events: logged-in actor. Legacy events: stored google_sync_user_id or assignee fallback.
 */
export async function resolveGoogleSyncUserId(
  supabase: SupabaseClient,
  opts: {
    actorUserId: string;
    workspaceOwnerId: string;
    googleSyncUserId?: string | null;
    assignedTo?: string | null;
    preferActor?: boolean;
  }
): Promise<string> {
  if (opts.googleSyncUserId?.trim()) {
    return opts.googleSyncUserId.trim();
  }

  if (opts.preferActor !== false) {
    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("id")
      .eq("user_id", opts.actorUserId)
      .maybeSingle();
    if (data?.id) return opts.actorUserId;
  }

  return resolveCalendarUserId(
    supabase,
    [opts.assignedTo, opts.actorUserId],
    opts.workspaceOwnerId
  );
}
