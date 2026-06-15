import type { SupabaseClient } from "@supabase/supabase-js";
import type { PipelineStage } from "@/types";
import { isWonPipelineStage } from "@/lib/project-stages/constants";

/** When an opportunity moves to Won, seed project_stage=onboarding (no webhook). */
export async function maybeInitProjectStageOnWon(
  supabase: SupabaseClient,
  opportunity: Record<string, unknown>,
  newStage: string,
  pipelineStages?: PipelineStage[]
): Promise<Record<string, unknown> | null> {
  if (opportunity.project_stage != null) return null;

  const stageName = pipelineStages?.find((s) => s.id === newStage)?.name;
  if (!isWonPipelineStage(newStage, stageName)) return null;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("opportunities")
    .update({
      project_stage: "onboarding",
      project_stage_updated_at: now,
      updated_at: now,
    })
    .eq("id", opportunity.id as string)
    .eq("user_id", opportunity.user_id as string)
    .select("*")
    .single();

  if (error) {
    console.error("maybeInitProjectStageOnWon:", error.message);
    return null;
  }

  return data as Record<string, unknown>;
}
