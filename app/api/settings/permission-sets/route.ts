import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { isPermissionKey, type PermissionGrant } from "@/lib/auth/permission-catalog";
import { createServerSideClient } from "@/lib/supabase";
import {
  createPermissionSet,
  listPermissionSets,
} from "@/lib/settings/permissions-db";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  grants: z.array(
    z.object({
      permission_key: z.string(),
      effect: z.enum(["allow", "deny"]),
    })
  ),
});

export async function GET() {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;
    const denied = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (denied) return denied;

    const supabase = createServerSideClient();
    const data = await listPermissionSets(supabase, workspaceOwnerId!);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/settings/permission-sets:", err);
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

    const grants = parsed.data.grants.filter(
      (g): g is PermissionGrant => isPermissionKey(g.permission_key)
    );

    const supabase = createServerSideClient();
    const row = await createPermissionSet(supabase, workspaceOwnerId!, {
      name: parsed.data.name,
      description: parsed.data.description,
      grants,
    });

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    console.error("POST /api/settings/permission-sets:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
