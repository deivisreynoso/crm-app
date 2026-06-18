import type { SupabaseClient } from "@supabase/supabase-js";
import { getClickIn360OrgUserIdOptional } from "@/lib/org/constants";
import { linkPendingTeamMemberByEmail } from "@/lib/team/link-member";

/**
 * Whether this Supabase user may access the ClickIn 360 internal CRM.
 * Requires team_members row for the org owner, or being the org owner UUID.
 */
export async function userCanAccessCrm(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  if (email) {
    await linkPendingTeamMemberByEmail(supabase, userId, email);
  }

  const orgOwnerId = getClickIn360OrgUserIdOptional();
  if (!orgOwnerId) return false;

  if (userId === orgOwnerId) return true;

  const { data: membership } = await supabase
    .from("team_members")
    .select("id")
    .eq("member_user_id", userId)
    .eq("owner_user_id", orgOwnerId)
    .maybeSingle();

  return !!membership?.id;
}
