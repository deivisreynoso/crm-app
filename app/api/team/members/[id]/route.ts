import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage, requireWorkspaceOwner } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { SupabaseConfigError } from "@/lib/supabase/config";
import { z } from "zod";
import { humanizeDbError } from "@/lib/validation-errors";
import { recordAuditLog } from "@/lib/audit/record";
import { deleteAuthUser } from "@/lib/users/delete-auth-user";

const patchMemberSchema = z.object({
  role: z.enum(["sales", "viewer", "admin", "finance", "support"]).optional(),
  custom_role_id: z.string().uuid().nullable().optional(),
  permission_set_ids: z.array(z.string().uuid()).optional(),
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
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (
      parsed.data.role === undefined &&
      parsed.data.custom_role_id === undefined &&
      parsed.data.permission_set_ids === undefined
    ) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
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
      .update({
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.custom_role_id !== undefined
          ? { custom_role_id: parsed.data.custom_role_id }
          : {}),
      })
      .eq("id", row.id)
      .select("id, member_user_id, email, display_name, role, custom_role_id")
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    if (parsed.data.permission_set_ids) {
      await supabase
        .from("team_member_permission_sets")
        .delete()
        .eq("member_id", row.id);

      if (parsed.data.permission_set_ids.length > 0) {
        const { error: linkError } = await supabase
          .from("team_member_permission_sets")
          .insert(
            parsed.data.permission_set_ids.map((permission_set_id) => ({
              member_id: row.id,
              permission_set_id,
            }))
          );
        if (linkError) {
          return NextResponse.json(
            { error: humanizeDbError(linkError.message) },
            { status: 500 }
          );
        }
      }
    }

    const label = (row.display_name as string | null)?.trim() || (row.email as string);

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "team_member.role_updated",
      entityType: "team_member",
      entityId: memberUserId,
      entityName: label,
      oldValues: {
        role: row.role,
        custom_role_id: (row as { custom_role_id?: string | null }).custom_role_id ?? null,
      },
      newValues: {
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        ...(parsed.data.custom_role_id !== undefined
          ? { custom_role_id: parsed.data.custom_role_id }
          : {}),
        ...(parsed.data.permission_set_ids
          ? { permission_set_ids: parsed.data.permission_set_ids }
          : {}),
      },
      changeSummary: `Updated permissions for ${label}`,
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

    const authDelete = await deleteAuthUser(
      supabase,
      memberUserId,
      row.email as string
    );
    if (!authDelete.ok) {
      console.error("DELETE /api/team/members/[id] auth delete:", authDelete.message);
      return NextResponse.json(
        {
          error:
            "Teammate was removed from the team but their login account could not be deleted. Run migration 049 in Supabase, or clear audit/assignee references manually.",
          detail: authDelete.message,
        },
        { status: 500 }
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
