import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Link auth user to team_members rows for this email (case-insensitive).
 * Always re-links to the signing-in user to repair stale member_user_id values.
 */
export async function linkPendingTeamMemberByEmail(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return false;

  const { data: rows } = await supabase
    .from("team_members")
    .select("id, display_name, member_user_id")
    .ilike("email", normalized);

  if (!rows?.length) return false;

  let linked = false;
  for (const row of rows) {
    if (row.member_user_id === userId) {
      linked = true;
      continue;
    }

    const { error } = await supabase
      .from("team_members")
      .update({ member_user_id: userId })
      .eq("id", row.id);

    if (!error) linked = true;
  }

  if (linked) {
    await supabase.from("user_profiles").upsert(
      {
        id: userId,
        email: normalized,
        display_name: rows[0]?.display_name ?? normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  }

  return linked;
}
