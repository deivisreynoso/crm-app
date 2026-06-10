import type { SupabaseClient } from "@supabase/supabase-js";

/** Null or remove public-schema rows that reference auth.users before admin delete. */
export async function clearUserReferencesBeforeDelete(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<void> {
  await supabase.from("audit_logs").update({ user_id: null }).eq("user_id", userId);
  await supabase.from("notes").update({ created_by: null }).eq("created_by", userId);
  await supabase.from("activities").update({ created_by: null }).eq("created_by", userId);
  await supabase.from("contacts").update({ assigned_to: null }).eq("assigned_to", userId);
  await supabase.from("tasks").update({ assigned_to: null }).eq("assigned_to", userId);
  await supabase.from("tickets").update({ assigned_to: null }).eq("assigned_to", userId);
  await supabase.from("opportunities").update({ owner_id: null }).eq("owner_id", userId);
  await supabase
    .from("user_settings")
    .update({ default_sales_assignee: null })
    .eq("default_sales_assignee", userId);
  await supabase
    .from("contact_emails")
    .update({ mailbox_user_id: null })
    .eq("mailbox_user_id", userId);

  await supabase.from("team_members").delete().eq("member_user_id", userId);

  if (email) {
    await supabase
      .from("team_invites")
      .delete()
      .eq("email", email.toLowerCase().trim());
  }

  await supabase.from("google_gmail_tokens").delete().eq("user_id", userId);
  await supabase.from("google_calendar_tokens").delete().eq("user_id", userId);
}

/** Remove Supabase Auth user after CRM references are cleared. */
export async function deleteAuthUser(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  await clearUserReferencesBeforeDelete(supabase, userId, email);
  await supabase.from("user_profiles").delete().eq("id", userId);

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
