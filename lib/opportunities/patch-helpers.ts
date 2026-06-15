import type { SupabaseClient } from "@supabase/supabase-js";
import type { PipelineStage } from "@/types";
import { maybeInitProjectStageOnWon } from "@/lib/project-stages/init-on-won";

export async function fetchPipelineStages(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  pipelineId: string | null | undefined
): Promise<PipelineStage[] | undefined> {
  if (!pipelineId) return undefined;

  const { data } = await supabase
    .from("pipelines")
    .select("stages")
    .eq("id", pipelineId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!data?.stages || !Array.isArray(data.stages)) return undefined;
  return data.stages as PipelineStage[];
}

export async function applyWonProjectStageInit(
  supabase: SupabaseClient,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  pipelineStages?: PipelineStage[]
): Promise<Record<string, unknown>> {
  if (before.stage === after.stage) return after;

  const initialized = await maybeInitProjectStageOnWon(
    supabase,
    after,
    after.stage as string,
    pipelineStages
  );

  return initialized ?? after;
}
