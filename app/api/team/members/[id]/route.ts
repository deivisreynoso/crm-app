import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage, requireWorkspaceOwner } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { SupabaseConfigError } from "@/lib/supabase/config";
import { z } from "zod";
import { humanizeDbError } from "@/lib/validation-errors";
import { recordAuditLog } from "@/lib/audit/record";

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

    const label = (row.display_name as string | null)?.trim() || (row.email as string);

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "team_member.role_updated",
      entityType: "team_member",
      entityId: memberUserId,
      entityName: label,
      oldValues: { role: row.role },
      newValues: { role: parsed.data.role },
      changeSummary: `Changed ${label} role from ${row.role} to ${parsed.data.role}`,
      req,
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH /api/team/members/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Remove a teammate from the workspace (workspace owner only). */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id: memberUserId } = await context.params;
    const { userId, workspaceOwnerId, isWorkspaceOwner, error } = await requireAuth();
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
      .eq("email", (row.email as string).toLowerCase());

    await supabase.from("user_profiles").delete().eq("id", memberUserId);

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      memberUserId
    );
    if (authDeleteError) {
      console.error(
        "DELETE /api/team/members/[id] auth delete:",
        authDeleteError.message
      );
    }

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "team_member.removed",
      entityType: "team_member",
      entityId: memberUserId,
      entityName: row.email as string,
      changeSummary: `Removed teammate ${row.email}`,
      req,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/team/members/[id]:", err);
    if (err instanceof SupabaseConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
