import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSenderDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const name = data?.display_name?.trim();
  return name || null;
}
