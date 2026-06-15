import { isWonPipelineStage } from "@/lib/project-stages/constants";
import type { OpportunityWithContact, Pipeline, PipelineStage } from "@/types";

/** Won opportunity with an active project stage (post-sale delivery). */
export function findContactProjectOpportunity(
  opportunities: OpportunityWithContact[],
  pipelines: Pipeline[]
): {
  opportunity: OpportunityWithContact;
  pipelineStages: PipelineStage[];
} | null {
  const withStage = opportunities.find((o) => o.project_stage);
  if (withStage) {
    const pipeline = pipelines.find((p) => p.id === withStage.pipeline_id);
    return {
      opportunity: withStage,
      pipelineStages: pipeline?.stages ?? [],
    };
  }

  for (const opp of opportunities) {
    const pipeline = pipelines.find((p) => p.id === opp.pipeline_id);
    const stageName = pipeline?.stages.find((s) => s.id === opp.stage)?.name;
    if (isWonPipelineStage(opp.stage, stageName)) {
      return {
        opportunity: opp,
        pipelineStages: pipeline?.stages ?? [],
      };
    }
  }

  return null;
}
