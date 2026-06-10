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

  const normalizedEmail = input.email.toLowerCase().trim();
  if (check.email.toLowerCase() !== normalizedEmail) {
    return { ok: false as const, reason: "email_mismatch" };
  }

  const supabase = createServerSideClient();

  const { data: invite, error: inviteError } = await supabase
    .from("team_invites")
    .select("owner_user_id, display_name")
    .eq("token", input.token)
    .single();

  if (inviteError || !invite) {
    return { ok: false as const, reason: "invalid" };
  }

  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id, role")
    .eq("owner_user_id", invite.owner_user_id)
    .eq("email", normalizedEmail)
    .maybeSingle();

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      id: input.userId,
      email: normalizedEmail,
      display_name: invite.display_name ?? normalizedEmail,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("completeTeamInvite user_profiles:", profileError.message);
    return { ok: false as const, reason: "db_error" };
  }

  const memberPayload = {
    owner_user_id: invite.owner_user_id,
    member_user_id: input.userId,
    email: normalizedEmail,
    display_name: invite.display_name ?? normalizedEmail,
    ...(existingMember?.role ? { role: existingMember.role } : {}),
  };

  const { error: memberError } = await supabase
    .from("team_members")
    .upsert(memberPayload, { onConflict: "owner_user_id,email" });

  if (memberError) {
    console.error("completeTeamInvite team_members upsert:", memberError.message);
    const { error: updateError } = await supabase
      .from("team_members")
      .update({
        member_user_id: input.userId,
        display_name: invite.display_name ?? normalizedEmail,
      })
      .eq("owner_user_id", invite.owner_user_id)
      .eq("email", normalizedEmail);

    if (updateError) {
      console.error("completeTeamInvite team_members update:", updateError.message);
      return { ok: false as const, reason: "db_error" };
    }
  }

  const { error: acceptError } = await supabase
    .from("team_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", input.token)
    .is("accepted_at", null);

  if (acceptError) {
    console.error("completeTeamInvite team_invites:", acceptError.message);
    return { ok: false as const, reason: "db_error" };
  }

  return { ok: true as const };
}
