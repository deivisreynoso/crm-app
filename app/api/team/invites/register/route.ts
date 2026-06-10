import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeTeamInvite, validateInviteToken } from "@/lib/team/invites";
import { createServerSideClient } from "@/lib/supabase";

const schema = z.object({
  token: z.string().min(16),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().max(120).optional(),
});

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createServerSideClient>,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) return null;

    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (match?.id) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

/** Invite-only registration: creates a confirmed Supabase user and links the workspace. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { token, email, password, full_name } = parsed.data;
    const check = await validateInviteToken(token);
    if (!check.valid) {
      return NextResponse.json(
        { error: "Invite invalid", reason: check.reason },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (check.email.toLowerCase() !== normalizedEmail) {
      return NextResponse.json(
        { error: "Email must match the invitation.", reason: "email_mismatch" },
        { status: 400 }
      );
    }

    const admin = createServerSideClient();
    const displayName = full_name?.trim() || check.display_name || normalizedEmail;

    let userId: string | null = null;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });

    if (created.user?.id) {
      userId = created.user.id;
    } else if (createError) {
      const msg = createError.message.toLowerCase();
      const alreadyExists =
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists");

      if (!alreadyExists) {
        console.error("POST /api/team/invites/register createUser:", createError.message);
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      const existingId = await findAuthUserIdByEmail(admin, normalizedEmail);
      if (!existingId) {
        return NextResponse.json(
          { error: "An account with this email already exists. Try signing in or use forgot password." },
          { status: 409 }
        );
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(existingId, {
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });

      if (updateError) {
        console.error("POST /api/team/invites/register updateUser:", updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      userId = existingId;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Could not create your account. Please try again." },
        { status: 500 }
      );
    }

    const result = await completeTeamInvite({
      token,
      userId,
      email: normalizedEmail,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Could not link your account to the workspace.", reason: result.reason },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch (err) {
    console.error("POST /api/team/invites/register:", err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
