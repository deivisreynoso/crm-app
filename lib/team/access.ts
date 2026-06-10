import type { SupabaseClient } from "@supabase/supabase-js";
import { linkPendingTeamMemberByEmail } from "@/lib/team/link-member";

/**
 * Whether this Supabase user may access the CRM (invite-based workspace model).
 * Owners without a team_members row are allowed when they own CRM data or env owner.
 */
export async function userCanAccessCrm(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<boolean> {
  if (email) {
    await linkPendingTeamMemberByEmail(supabase, userId, email);
  }
  const envOwner = process.env.WEBSITE_LEADS_USER_ID?.trim();
  if (envOwner && userId === envOwner) return true;

  const { data: memberships } = await supabase
    .from("team_members")
    .select("id")
    .eq("member_user_id", userId)
    .limit(1);

  if (memberships?.length) return true;

  const { count: teamCount } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", userId);

  if (teamCount && teamCount > 0) return true;

  const { count: contactCount } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (contactCount && contactCount > 0) return true;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  return !!settings?.id;
}
