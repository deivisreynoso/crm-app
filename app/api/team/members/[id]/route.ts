import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage, requireWorkspaceOwner } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { humanizeDbError } from "@/lib/validation-errors";

const patchMemberSchema = z.object({
  role: z.enum(["sales", "viewer", "admin"]),
});

type RouteContext = { params: Promise<{ id: string }> };

/** Update a linked teammate's workspace role (owner / admin only). */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: memberUserId } = await context.params;
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } =
      await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const body = await req.json();
    const parsed = patchMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (memberUserId === workspaceOwnerId) {
      return NextResponse.json(
        { error: "The workspace owner role cannot be changed" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();

    const { data: row, error: findError } = await supabase
      .from("team_members")
      .select("id, member_user_id, email, display_name, role")
      .eq("owner_user_id", workspaceOwnerId!)
      .eq("member_user_id", memberUserId)
      .maybeSingle();

    if (findError || !row?.member_user_id) {
      return NextResponse.json({ error: "Teammate not found" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("team_members")
      .update({ role: parsed.data.role })
      .eq("id", row.id)
      .select("member_user_id, email, display_name, role")
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH /api/team/members/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Remove a teammate from the workspace (workspace owner only). */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id: memberUserId } = await context.params;
    const { workspaceOwnerId, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const ownerError = requireWorkspaceOwner(isWorkspaceOwner);
    if (ownerError) return ownerError;

    if (memberUserId === workspaceOwnerId) {
      return NextResponse.json(
        { error: "The workspace owner cannot be removed" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();

    const { data: row, error: findError } = await supabase
      .from("team_members")
      .select("id, member_user_id, email")
      .eq("owner_user_id", workspaceOwnerId!)
      .eq("member_user_id", memberUserId)
      .maybeSingle();

    if (findError || !row) {
      return NextResponse.json({ error: "Teammate not found" }, { status: 404 });
    }

    const { error: dbError } = await supabase
      .from("team_members")
      .delete()
      .eq("id", row.id);

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    await supabase
      .from("team_invites")
      .delete()
      .eq("owner_user_id", workspaceOwnerId!)
      .eq("email", row.email.toLowerCase());

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/team/members/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
