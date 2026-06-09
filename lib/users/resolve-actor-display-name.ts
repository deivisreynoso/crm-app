import type { createServerSideClient } from "@/lib/supabase";
import { resolveAuthorNames } from "@/lib/activities/resolve-author-names";
import { formatAuthorDisplayName } from "@/lib/users/author-display-name";
import { ensureUserProfile } from "@/lib/users/ensure-user-profile";
import { displayNameFromAuthUser } from "@/lib/users/auth-user-display-name";

async function nameFromTeamMember(
  supabase: ReturnType<typeof createServerSideClient>,
  userId: string
): Promise<string | null> {
  const { data: member, error } = await supabase
    .from("team_members")
    .select("display_name, email")
    .eq("member_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("resolveActorDisplayName team_members:", error.message);
    return null;
  }

  return formatAuthorDisplayName({
    displayName: member?.display_name as string | null,
    email: member?.email as string | null,
  });
}

/** Always returns a non-empty label for timeline attribution. */
export async function resolveActorDisplayName(
  supabase: ReturnType<typeof createServerSideClient>,
  userId: string,
  session?: { name?: string | null; email?: string | null }
): Promise<string> {
  const fromTeam = await nameFromTeamMember(supabase, userId);
  if (fromTeam) {
    await ensureUserProfile(supabase, {
      userId,
      email: session?.email,
      displayName: fromTeam,
    });
    return fromTeam;
  }

  const fromSession = formatAuthorDisplayName({
    displayName: session?.name,
    fullName: session?.name,
    email: session?.email,
  });
  if (fromSession) {
    await ensureUserProfile(supabase, {
      userId,
      email: session?.email,
      displayName: fromSession,
    });
    return fromSession;
  }

  await ensureUserProfile(supabase, {
    userId,
    email: session?.email,
    displayName: session?.name,
  });

  const names = await resolveAuthorNames(supabase, [userId]);
  const resolved = names.get(userId);
  if (resolved) return resolved;

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (!error && data.user) {
    const fromAuth = displayNameFromAuthUser(data.user);
    if (fromAuth) return fromAuth;
  }

  const email = session?.email?.trim();
  if (email) return email;

  return "Unknown user";
}
