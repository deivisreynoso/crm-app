import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { humanizeDbError } from "@/lib/validation-errors";
import { createTeamInvite } from "@/lib/team/invites";
import { requireTransactionalEmailForAuth } from "@/lib/email/auth-email-policy";
import { teamInviteEmailHtml } from "@/lib/email/transactional-templates";
import { sendEmail } from "@/lib/email/send";
import { ensureUserCalendarColor } from "@/lib/users/assign-calendar-color";

const addMemberSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1).max(120).optional(),
  role: z.enum(["sales", "viewer", "admin"]).optional(),
});

async function upsertProfile(
  userId: string,
  email: string,
  name: string
) {
  const supabase = createServerSideClient();
  if (!email) return;
  await supabase.from("user_profiles").upsert(
    {
      id: userId,
      email,
      display_name: name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

/** Assignable users: workspace owner + linked teammates. */
export async function GET() {
  try {
    const { userId, workspaceOwnerId, session, error } = await requireAuth();
    if (error) return error;

    const email = session!.user?.email ?? "";
    const name = session!.user?.name ?? email;

    const supabase = createServerSideClient();

    await upsertProfile(userId!, email, name);
    await ensureUserCalendarColor(supabase, userId!);

    const { data: ownerProfile } = await supabase
      .from("user_profiles")
      .select("id, email, display_name")
      .eq("id", workspaceOwnerId!)
      .maybeSingle();

    const members: {
      id: string;
      label: string;
      email: string;
      role?: string;
    }[] = [];

    if (workspaceOwnerId === userId) {
      members.push({
        id: userId!,
        label: `${name} (you, owner)`,
        email,
        role: "owner",
      });
    } else if (ownerProfile) {
      members.push({
        id: ownerProfile.id,
        label: `${ownerProfile.display_name ?? ownerProfile.email} (owner)`,
        email: ownerProfile.email,
        role: "owner",
      });
    }

    const { data: team } = await supabase
      .from("team_members")
      .select("member_user_id, email, display_name, role")
      .eq("owner_user_id", workspaceOwnerId!)
      .not("member_user_id", "is", null);

    for (const row of team ?? []) {
      if (!row.member_user_id) continue;
      const isSelf = row.member_user_id === userId;
      members.push({
        id: row.member_user_id,
        label: isSelf
          ? `${row.display_name ?? row.email} (you)`
          : (row.display_name ?? row.email),
        email: row.email,
        role: row.role ?? "sales",
      });
    }

    return NextResponse.json({ data: members });
  } catch (err) {
    console.error("GET /api/team/members:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const body = await req.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const email = parsed.data.email.toLowerCase().trim();
    const memberRole = parsed.data.role ?? "sales";

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, email, display_name")
      .eq("email", email)
      .maybeSingle();

    const { data, error: dbError } = await supabase
      .from("team_members")
      .insert([
        {
          owner_user_id: workspaceOwnerId!,
          email,
          display_name:
            parsed.data.display_name?.trim() || profile?.display_name || email,
          member_user_id: profile?.id ?? null,
          role: memberRole,
        },
      ])
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    let invite_url: string | null = null;

    if (!profile?.id) {
      try {
        const invite = await createTeamInvite({
          ownerUserId: workspaceOwnerId!,
          email,
          displayName: parsed.data.display_name,
        });
        invite_url = invite.invite_url;

        try {
          requireTransactionalEmailForAuth();
          await sendEmail({
            to: email,
            subject: "You're invited to ClickIn 360 CRM",
            html: teamInviteEmailHtml(invite.invite_url),
          });
        } catch (mailErr) {
          console.error("Invite email failed:", mailErr);
        }
      } catch (inviteErr) {
        console.error("Create invite failed:", inviteErr);
        invite_url = null;
      }
    }

    return NextResponse.json({ ...data, invite_url }, { status: 201 });
  } catch (err) {
    console.error("POST /api/team/members:", err);
    return NextResponse.json({ error: "Failed to add teammate" }, { status: 500 });
  }
}
