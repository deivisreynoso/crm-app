import type { createServerSideClient } from "@/lib/supabase";
import { displayNameFromAuthUser } from "@/lib/users/auth-user-display-name";
import { formatAuthorDisplayName } from "@/lib/users/author-display-name";

export async function resolveAuthorNames(
  supabase: ReturnType<typeof createServerSideClient>,
  userIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!uniqueIds.length) return map;

  const [profilesRes, teammatesRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, display_name, email")
      .in("id", uniqueIds),
    supabase
      .from("team_members")
      .select("member_user_id, display_name, email")
      .in("member_user_id", uniqueIds),
  ]);

  if (profilesRes.error) {
    console.error("resolveAuthorNames profiles:", profilesRes.error.message);
  }
  if (teammatesRes.error) {
    console.error("resolveAuthorNames team_members:", teammatesRes.error.message);
  }

  for (const profile of profilesRes.data ?? []) {
    const name = formatAuthorDisplayName({
      displayName: profile.display_name,
      email: profile.email,
    });
    if (name) map.set(profile.id, name);
  }

  for (const member of teammatesRes.data ?? []) {
    const memberId = member.member_user_id as string | null;
    if (!memberId || map.has(memberId)) continue;
    const name = formatAuthorDisplayName({
      displayName: member.display_name as string | null,
      email: member.email as string | null,
    });
    if (name) map.set(memberId, name);
  }

  const missing = uniqueIds.filter((id) => !map.has(id));
  if (!missing.length) return map;

  await Promise.all(
    missing.map(async (id) => {
      const { data, error: authError } = await supabase.auth.admin.getUserById(id);
      if (authError || !data.user) return;
      const name = displayNameFromAuthUser(data.user);
      if (!name) return;
      map.set(id, name);
      await supabase.from("user_profiles").upsert(
        {
          id,
          email: data.user.email ?? "",
          display_name: name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    })
  );

  return map;
}
