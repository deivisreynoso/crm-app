import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve who receives website leads when settings leave assignee empty. */
export async function resolveWebLeadsAssignee(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  storedAssignee: string | null | undefined
): Promise<string | null> {
  if (storedAssignee) return storedAssignee;

  const emailHint =
    process.env.DEFAULT_WEB_LEADS_ASSIGNEE_EMAIL?.trim().toLowerCase() ?? null;

  if (emailHint) {
    const { data: byEmail } = await supabase
      .from("team_members")
      .select("member_user_id")
      .eq("owner_user_id", workspaceOwnerId)
      .ilike("email", emailHint)
      .not("member_user_id", "is", null)
      .maybeSingle();

    if (byEmail?.member_user_id) {
      return byEmail.member_user_id as string;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .ilike("email", emailHint)
      .maybeSingle();

    if (profile?.id) return profile.id as string;
  }

  const { data: byName } = await supabase
    .from("team_members")
    .select("member_user_id, display_name")
    .eq("owner_user_id", workspaceOwnerId)
    .not("member_user_id", "is", null);

  const elizabeth = (byName ?? []).find((row) =>
    String(row.display_name ?? "")
      .toLowerCase()
      .includes("elizabeth reynoso")
  );

  if (elizabeth?.member_user_id) {
    return elizabeth.member_user_id as string;
  }

  return null;
}
