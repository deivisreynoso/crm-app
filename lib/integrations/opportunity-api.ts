import type { SupabaseClient } from "@supabase/supabase-js";
import { buildOpportunityRecord, buildOpportunityUpdate } from "@/lib/opportunity-payload";
import {
  attachContactToOpportunity,
  listOpportunitiesWithContacts,
} from "@/lib/opportunity-queries";
import {
  applyWonProjectStageInit,
  fetchPipelineStages,
} from "@/lib/opportunities/patch-helpers";
import { triggerN8NWebhook } from "@/lib/n8n";
import {
  moveOpportunityStageSchema,
  opportunityPatchSchema,
  opportunitySchema,
} from "@/lib/validators";
import { formatValidationDetails } from "@/lib/validation-errors";

export type IntegrationOppResult =
  | { ok: true; data: Record<string, unknown> | Record<string, unknown>[] }
  | { ok: false; status: number; error: string; details?: unknown };

function isStageOnlyUpdate(body: Record<string, unknown>) {
  const keys = Object.keys(body);
  return keys.length === 1 && keys[0] === "stage";
}

export async function listOpportunitiesForIntegration(
  workspaceOwnerId: string,
  params: {
    pipelineId?: string;
    contactId?: string;
    stage?: string;
    search?: string;
  }
): Promise<IntegrationOppResult> {
  const data = await listOpportunitiesWithContacts(workspaceOwnerId, params);
  return { ok: true, data: data as unknown as Record<string, unknown>[] };
}

export async function createOpportunityForIntegration(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  body: unknown
): Promise<IntegrationOppResult> {
  const parsed = opportunitySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: formatValidationDetails(parsed.error.flatten()) || "Validation failed",
      details: parsed.error.flatten(),
    };
  }

  const payload = buildOpportunityRecord(parsed.data, workspaceOwnerId);

  if (!payload.company_id && parsed.data.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("company_id")
      .eq("id", parsed.data.contact_id)
      .single();
    if (contact?.company_id) {
      payload.company_id = contact.company_id;
    }
  }

  const { data, error: dbError } = await supabase
    .from("opportunities")
    .insert([payload])
    .select("*")
    .single();

  if (dbError) {
    return { ok: false, status: 500, error: dbError.message };
  }

  let enriched = data as Record<string, unknown>;
  try {
    enriched = (await attachContactToOpportunity(data)) as Record<string, unknown>;
  } catch {
    /* keep raw */
  }
  await triggerN8NWebhook("opportunity.created", enriched);
  return { ok: true, data: enriched };
}

export async function patchOpportunityForIntegration(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  id: string,
  body: unknown
): Promise<IntegrationOppResult> {
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
    const parsed = opportunityPatchSchema.safeParse(raw);
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

  const { data: before } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!before) {
    return { ok: false, status: 404, error: "Opportunity not found" };
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

  const pipelineStages = await fetchPipelineStages(
    supabase,
    workspaceOwnerId,
    (data.pipeline_id as string | null) ?? (before.pipeline_id as string | null)
  );

  const withProjectStage = await applyWonProjectStageInit(
    supabase,
    before as Record<string, unknown>,
    data as Record<string, unknown>,
    pipelineStages
  );

  let enriched = withProjectStage;
  try {
    enriched = (await attachContactToOpportunity(withProjectStage)) as Record<
      string,
      unknown
    >;
  } catch {
    /* keep raw */
  }
  await triggerN8NWebhook("opportunity.updated", enriched);
  return { ok: true, data: enriched };
}
