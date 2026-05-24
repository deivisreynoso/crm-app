import { randomBytes } from "crypto";
import { createServerSideClient } from "@/lib/supabase";

const INVITE_TTL_DAYS = 7;

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function buildInviteUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/register?invite=${token}`;
}

export async function createTeamInvite(input: {
  ownerUserId: string;
  email: string;
  displayName?: string | null;
}) {
  const supabase = createServerSideClient();
  const email = input.email.toLowerCase().trim();
  const token = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("team_invites")
    .insert([
      {
        owner_user_id: input.ownerUserId,
        email,
        display_name: input.displayName?.trim() || null,
        token,
        expires_at: expiresAt,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return {
    invite: data,
    invite_url: buildInviteUrl(token),
    expires_at: expiresAt,
  };
}

export async function validateInviteToken(token: string) {
  const supabase = createServerSideClient();
  const { data, error } = await supabase
    .from("team_invites")
    .select("id, email, display_name, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return { valid: false as const, reason: "invalid" };
  if (data.accepted_at) return { valid: false as const, reason: "used" };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { valid: false as const, reason: "expired" };
  }

  return {
    valid: true as const,
    email: data.email as string,
    display_name: (data.display_name as string | null) ?? null,
    invite_id: data.id as string,
  };
}

export async function completeTeamInvite(input: {
  token: string;
  userId: string;
  email: string;
}) {
  const check = await validateInviteToken(input.token);
  if (!check.valid) return { ok: false as const, reason: check.reason };

  if (check.email.toLowerCase() !== input.email.toLowerCase().trim()) {
    return { ok: false as const, reason: "email_mismatch" };
  }

  const supabase = createServerSideClient();

  const { data: invite } = await supabase
    .from("team_invites")
    .select("owner_user_id, display_name")
    .eq("token", input.token)
    .single();

  if (!invite) return { ok: false as const, reason: "invalid" };

  await supabase
    .from("team_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", input.token);

  await supabase.from("user_profiles").upsert(
    {
      id: input.userId,
      email: input.email.toLowerCase().trim(),
      display_name: invite.display_name ?? input.email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  await supabase.from("team_members").upsert(
    {
      owner_user_id: invite.owner_user_id,
      member_user_id: input.userId,
      email: input.email.toLowerCase().trim(),
      display_name: invite.display_name ?? input.email,
    },
    { onConflict: "owner_user_id,email" }
  );

  return { ok: true as const };
}
