import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureUserProfile } from "@/lib/users/ensure-user-profile";
import { linkPendingTeamMemberByEmail } from "@/lib/team/link-member";
import { userCanAccessCrm } from "@/lib/team/access";
import {
  findCanonicalUserIdByEmail,
  resolveCanonicalCrmUserId,
} from "@/lib/auth/canonical-user";
import { findSupabaseAuthUserIdByEmail } from "@/lib/auth/supabase-auth-user";

export type GoogleProfile = {
  email: string;
  name?: string | null;
  image?: string | null;
};

/** Resolve Supabase auth user for a Google sign-in (existing invite user only). */
export async function resolveGoogleLoginUser(
  supabase: SupabaseClient,
  profile: GoogleProfile
): Promise<{ userId: string; email: string; name: string } | null> {
  const email = profile.email.trim().toLowerCase();
  let userId = await findSupabaseAuthUserIdByEmail(supabase, email);

  if (!userId) {
    userId = await findCanonicalUserIdByEmail(supabase, email);
  }

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

  const canonicalUserId = await resolveCanonicalCrmUserId(supabase, userId, email);

  await linkPendingTeamMemberByEmail(supabase, canonicalUserId, email);

  const allowed = await userCanAccessCrm(supabase, canonicalUserId, email);
  if (!allowed) return null;

  const displayName = profile.name?.trim() || email;

  await ensureUserProfile(supabase, {
    userId: canonicalUserId,
    email,
    displayName,
  });

  return { userId: canonicalUserId, email, name: displayName };
}
