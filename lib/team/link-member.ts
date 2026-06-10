import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Link auth user to pending team_members rows (invited email, no member_user_id yet).
 * Repairs partial invite completion and enables login after registration.
 */
export async function linkPendingTeamMemberByEmail(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return false;

  const { data: pending } = await supabase
    .from("team_members")
    .select("id, owner_user_id, display_name, role")
    .eq("email", normalized)
    .is("member_user_id", null);

  if (!pending?.length) return false;

  let linked = false;
  for (const row of pending) {
    const { error } = await supabase
      .from("team_members")
      .update({ member_user_id: userId })
      .eq("id", row.id)
      .is("member_user_id", null);

    if (!error) linked = true;
  }

  if (linked) {
    await supabase.from("user_profiles").upsert(
      {
        id: userId,
        email: normalized,
        display_name: pending[0]?.display_name ?? normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  }

  return linked;
}
