import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { humanizeDbError } from "@/lib/validation-errors";

const MAX_LIMIT = 100;

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  workspace_owner_id: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  action: string;
  change_summary: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  timestamp: string;
  actor_display_name: string | null;
  actor_email: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50)
    );
    const offset = (page - 1) * limit;

    const supabase = createServerSideClient();
    const { data: rows, error: dbError, count } = await supabase
      .from("audit_logs")
      .select(
        "id, user_id, workspace_owner_id, entity_type, entity_id, entity_name, action, change_summary, old_values, new_values, ip_address, timestamp",
        { count: "exact" }
      )
      .eq("workspace_owner_id", workspaceOwnerId!)
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    const actorIds = [
      ...new Set(
        (rows ?? [])
          .map((r) => r.user_id as string | null)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const profileMap = new Map<
      string,
      { display_name: string | null; email: string }
    >();

    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, display_name, email")
        .in("id", actorIds);

      for (const p of profiles ?? []) {
        profileMap.set(p.id as string, {
          display_name: (p.display_name as string | null) ?? null,
          email: p.email as string,
        });
      }
    }

    const data: AuditLogRow[] = (rows ?? []).map((row) => {
      const profile = row.user_id ? profileMap.get(row.user_id as string) : null;
      return {
        id: row.id as string,
        user_id: row.user_id as string | null,
        workspace_owner_id: row.workspace_owner_id as string,
        entity_type: row.entity_type as string | null,
        entity_id: row.entity_id as string | null,
        entity_name: row.entity_name as string | null,
        action: row.action as string,
        change_summary: row.change_summary as string | null,
        old_values: row.old_values as Record<string, unknown> | null,
        new_values: row.new_values as Record<string, unknown> | null,
        ip_address: row.ip_address as string | null,
        timestamp: row.timestamp as string,
        actor_display_name: profile?.display_name ?? null,
        actor_email: profile?.email ?? null,
      };
    });

    return NextResponse.json({
      data,
      page,
      limit,
      total: count ?? data.length,
    });
  } catch (err) {
    console.error("GET /api/audit-logs:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
