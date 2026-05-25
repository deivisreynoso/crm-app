import type { SupabaseClient } from "@supabase/supabase-js";
import { buildOpportunityUpdate } from "@/lib/opportunity-payload";
import { attachContactToOpportunity } from "@/lib/opportunity-queries";
import { triggerN8NWebhook } from "@/lib/n8n";
import {
  moveOpportunityStageSchema,
  opportunitySchema,
} from "@/lib/validators";

export type PatchOpportunityResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string; details?: unknown };

function isStageOnlyUpdate(body: Record<string, unknown>) {
  const keys = Object.keys(body);
  return keys.length === 1 && keys[0] === "stage";
}

export async function patchOpportunityForIntegration(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  id: string,
  body: unknown
): Promise<PatchOpportunityResult> {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }

  const raw = body as Record<string, unknown>;
  let updates: Record<string, unknown>;

  if (isStageOnlyUpdate(raw)) {
    const parsed = moveOpportunityStageSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, status: 400, error: "Validation failed" };
    }
    updates = { stage: parsed.data.stage };
  } else {
    const parsed = opportunitySchema.partial().safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        status: 400,
        error: "Validation failed",
        details: parsed.error.flatten(),
      };
    }
    updates = buildOpportunityUpdate(parsed.data);
  }

  const { data, error: dbError } = await supabase
    .from("opportunities")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", workspaceOwnerId)
    .select("*")
    .single();

  if (dbError) {
    return { ok: false, status: 500, error: dbError.message };
  }

  if (!data) {
    return { ok: false, status: 404, error: "Opportunity not found" };
  }

  let enriched = data as Record<string, unknown>;
  try {
    enriched = (await attachContactToOpportunity(data)) as Record<string, unknown>;
  } catch {
    /* return raw row if enrich fails */
  }

  await triggerN8NWebhook("opportunity.updated", enriched);

  return { ok: true, data: enriched };
}
