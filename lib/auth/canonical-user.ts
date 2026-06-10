import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveWorkspaceContext } from "@/lib/team/workspace";

function parseOwnerLoginAliases(): string[] {
  return (process.env.OWNER_LOGIN_ALIASES ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function envCanonicalOwnerId(email: string): string | null {
  const ownerId = process.env.WEBSITE_LEADS_USER_ID?.trim();
  if (!ownerId) return null;

  const normalized = email.toLowerCase().trim();
  const aliases = parseOwnerLoginAliases();
  if (aliases.includes(normalized)) return ownerId;

  return null;
}

async function userOwnsWorkspace(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const envOwner = process.env.WEBSITE_LEADS_USER_ID?.trim();
  if (envOwner && userId === envOwner) return true;

  const { count } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", userId);

  return (count ?? 0) > 0;
}

/**
 * Before creating a new auth user, check if this email already maps to a
 * workspace owner or linked teammate.
 */
export async function findCanonicalUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = email.toLowerCase().trim();
  const envOwner = envCanonicalOwnerId(normalized);
  if (envOwner) return envOwner;

  const { data: teamRows } = await supabase
    .from("team_members")
    .select("owner_user_id, member_user_id")
    .ilike("email", normalized);

  for (const row of teamRows ?? []) {
    if (row.member_user_id) return row.member_user_id;
    if (
      row.owner_user_id &&
      (await userOwnsWorkspace(supabase, row.owner_user_id))
    ) {
      return row.owner_user_id;
    }
  }

  return null;
}

/**
 * Map duplicate auth accounts (e.g. owner personal + workspace Google) to the
 * canonical CRM user id used for session and workspace context.
 */
export async function resolveCanonicalCrmUserId(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const envOwner = envCanonicalOwnerId(normalized);
  if (envOwner) return envOwner;

  const envOwnerId = process.env.WEBSITE_LEADS_USER_ID?.trim();
  if (envOwnerId && userId === envOwnerId) return userId;

  const { data: teamRows } = await supabase
    .from("team_members")
    .select("owner_user_id, member_user_id")
    .ilike("email", normalized);

  for (const row of teamRows ?? []) {
    if (row.member_user_id === userId) return userId;
  }

  if (await userOwnsWorkspace(supabase, userId)) return userId;

  const ctx = await resolveWorkspaceContext(userId);
  if (!ctx.isWorkspaceOwner) return userId;

  for (const row of teamRows ?? []) {
    const ownerId = row.owner_user_id;
    if (!ownerId || ownerId === userId) continue;
    if (await userOwnsWorkspace(supabase, ownerId)) return ownerId;
  }

  return userId;
}
