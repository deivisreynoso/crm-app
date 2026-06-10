import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureUserProfile } from "@/lib/users/ensure-user-profile";
import { linkPendingTeamMemberByEmail } from "@/lib/team/link-member";
import { userCanAccessCrm } from "@/lib/team/access";

export type GoogleProfile = {
  email: string;
  name?: string | null;
  image?: string | null;
};

async function findAuthUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  const normalized = email.toLowerCase().trim();

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) return null;

    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match?.id) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

/** Resolve Supabase auth user for a Google sign-in (existing invite user only). */
export async function resolveGoogleLoginUser(
  supabase: SupabaseClient,
  profile: GoogleProfile
): Promise<{ userId: string; email: string; name: string } | null> {
  const email = profile.email.trim().toLowerCase();
  let userId = await findAuthUserIdByEmail(supabase, email);

  if (!userId) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: profile.name?.trim() || email,
        avatar_url: profile.image ?? undefined,
      },
    });
    if (error || !created.user?.id) return null;
    userId = created.user.id;
  }

  await linkPendingTeamMemberByEmail(supabase, userId, email);

  const allowed = await userCanAccessCrm(supabase, userId, email);
  if (!allowed) return null;

  const displayName = profile.name?.trim() || email;
  await ensureUserProfile(supabase, {
    userId,
    email,
    displayName,
  });

  return { userId, email, name: displayName };
}
