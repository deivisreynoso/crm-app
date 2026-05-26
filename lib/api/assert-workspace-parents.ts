import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceParentIds = {
  contact_id?: string | null;
  company_id?: string | null;
  opportunity_id?: string | null;
};

function trimId(id?: string | null): string | null {
  const value = id?.trim();
  return value || null;
}

async function existsInWorkspace(
  supabase: SupabaseClient,
  table: "contacts" | "companies" | "opportunities",
  workspaceOwnerId: string,
  id: string
): Promise<boolean> {
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();
  return !!data;
}

/** Ensure linked parent records belong to the workspace owner (service-role APIs). */
export async function assertParentsInWorkspace(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  ids: WorkspaceParentIds
): Promise<{ ok: true } | { ok: false; error: string }> {
  const contactId = trimId(ids.contact_id);
  const companyId = trimId(ids.company_id);
  const opportunityId = trimId(ids.opportunity_id);

  if (
    contactId &&
    !(await existsInWorkspace(supabase, "contacts", workspaceOwnerId, contactId))
  ) {
    return { ok: false, error: "Contact not found in this workspace." };
  }
  if (
    companyId &&
    !(await existsInWorkspace(supabase, "companies", workspaceOwnerId, companyId))
  ) {
    return { ok: false, error: "Account not found in this workspace." };
  }
  if (
    opportunityId &&
    !(await existsInWorkspace(
      supabase,
      "opportunities",
      workspaceOwnerId,
      opportunityId
    ))
  ) {
    return { ok: false, error: "Opportunity not found in this workspace." };
  }

  return { ok: true };
}

export function workspaceParentForbidden(
  result: { ok: true } | { ok: false; error: string }
): NextResponse | null {
  if (result.ok) return null;
  return NextResponse.json({ error: result.error }, { status: 400 });
}
