import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase auth.users id for an email (admin API). */
export async function findSupabaseAuthUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  const normalized = email.toLowerCase().trim();

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || !data.users.length) return null;

    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match?.id) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}
