import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { isPermissionKey, type PermissionGrant } from "@/lib/auth/permission-catalog";
import { createServerSideClient } from "@/lib/supabase";
import {
  listPermissionSets,
  replacePermissionSetGrants,
} from "@/lib/settings/permissions-db";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  grants: z
    .array(
      z.object({
        permission_key: z.string(),
        effect: z.enum(["allow", "deny"]),
      })
    )
    .optional(),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;
    const denied = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (denied) return denied;

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.name) patch.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) {
      patch.description = parsed.data.description?.trim() || null;
    }

    const { data, error: dbError } = await supabase
      .from("workspace_permission_sets")
      .update(patch)
      .eq("id", id)
      .eq("owner_user_id", workspaceOwnerId!)
      .select("id")
      .maybeSingle();

    if (dbError || !data) {
      return NextResponse.json({ error: "Permission set not found" }, { status: 404 });
    }

    if (parsed.data.grants) {
      const grants = parsed.data.grants.filter(
        (g): g is PermissionGrant => isPermissionKey(g.permission_key)
      );
      await replacePermissionSetGrants(supabase, workspaceOwnerId!, id, grants);
    }

    const rows = await listPermissionSets(supabase, workspaceOwnerId!);
    const row = rows.find((r) => r.id === id);
    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("PATCH /api/settings/permission-sets/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;
    const denied = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (denied) return denied;

    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("workspace_permission_sets")
      .delete()
      .eq("id", id)
      .eq("owner_user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/settings/permission-sets/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
