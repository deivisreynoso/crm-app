import type { NextRequest } from "next/server";
import { createServerSideClient } from "@/lib/supabase";

export type AuditLogInput = {
  workspaceOwnerId: string;
  actorUserId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  changes?: Record<string, unknown> | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  changeSummary?: string | null;
  req?: NextRequest;
};

function requestMeta(req?: NextRequest) {
  if (!req) return { ip_address: null as string | null, user_agent: null as string | null };
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  return {
    ip_address: ip,
    user_agent: req.headers.get("user-agent"),
  };
}

/** Best-effort insert; never throws (audit must not break primary mutations). */
export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const supabase = createServerSideClient();
    const meta = requestMeta(input.req);

    const { error } = await supabase.from("audit_logs").insert({
      workspace_owner_id: input.workspaceOwnerId,
      user_id: input.actorUserId,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
      action: input.action,
      changes: input.changes ?? null,
      old_values: input.oldValues ?? null,
      new_values: input.newValues ?? null,
      change_summary: input.changeSummary ?? null,
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
    });

    if (error) {
      console.error("recordAuditLog:", error.message);
    }
  } catch (err) {
    console.error("recordAuditLog:", err);
  }
}
