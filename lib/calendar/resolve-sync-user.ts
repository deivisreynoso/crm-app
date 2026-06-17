import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCalendarUserId } from "@/lib/google/resolve-calendar-user";

/**
 * Google Calendar user for sync operations.
 * CRM events sync to Owner (assigned_to) when connected; legacy rows keep google_sync_user_id.
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

  const preferred = [
    opts.assignedTo,
    opts.preferActor !== false ? opts.actorUserId : null,
    opts.actorUserId,
  ];

  return resolveCalendarUserId(
    supabase,
    preferred,
    opts.workspaceOwnerId
  );
}
