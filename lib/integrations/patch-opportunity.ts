import type { SupabaseClient } from "@supabase/supabase-js";
import {
  patchOpportunityForIntegration as patchOpportunityCore,
  type IntegrationOppResult,
} from "@/lib/integrations/opportunity-api";

export type PatchOpportunityResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string; details?: unknown };

export async function patchOpportunityForIntegration(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  id: string,
  body: unknown
): Promise<PatchOpportunityResult> {
  const result = await patchOpportunityCore(supabase, workspaceOwnerId, id, body);
  return result as PatchOpportunityResult;
}
