import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { isPermissionKey, type PermissionGrant } from "@/lib/auth/permission-catalog";
import { createServerSideClient } from "@/lib/supabase";
import {
  createCustomRole,
  listCustomRoles,
} from "@/lib/settings/permissions-db";
import type { TeamRole } from "@/lib/team/workspace";

const grantSchema = z.object({
  permission_key: z.string(),
  effect: z.enum(["allow", "deny"]),
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  base_role: z.enum(["sales", "viewer", "admin", "finance", "support"]),
  grants: z.array(grantSchema).optional(),
});

export async function GET() {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;
    const denied = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (denied) return denied;

    const supabase = createServerSideClient();
    const data = await listCustomRoles(supabase, workspaceOwnerId!);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/settings/custom-roles:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;
    const denied = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (denied) return denied;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const grants = (parsed.data.grants ?? []).filter(
      (g): g is PermissionGrant => isPermissionKey(g.permission_key)
    );

    const supabase = createServerSideClient();
    const row = await createCustomRole(supabase, workspaceOwnerId!, {
      name: parsed.data.name,
      description: parsed.data.description,
      base_role: parsed.data.base_role as TeamRole,
      grants,
    });

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/settings/custom-roles:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
