import type { SupabaseClient } from "@supabase/supabase-js";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { isWonPipelineStage } from "@/lib/project-stages/constants";
import { maybeInitProjectStageOnWon } from "@/lib/project-stages/init-on-won";
import type { PipelineStage } from "@/types";

export type CloseWonInput = {
  contact_id: string;
  document_id: string;
  invoice_total: number;
};

export type CloseWonResult =
  | { ok: true; opportunity_id: string; already_won: boolean }
  | { ok: false; reason: string };

function findWonStageId(stages: PipelineStage[]): string | null {
  for (const stage of stages) {
    if (isWonPipelineStage(stage.id, stage.name)) return stage.id;
  }
  return null;
}

/** Close the opportunity linked to a paid quote invoice (N8N onboarding kickoff). */
export async function closeWonOpportunityForInvoice(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: CloseWonInput
): Promise<CloseWonResult> {
  const { contact_id, document_id, invoice_total } = input;

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, stage, pipeline_id, project_stage, contact_id, user_id, title")
    .eq("user_id", workspaceOwnerId)
    .eq("contact_id", contact_id)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (!opportunities?.length) {
    console.warn("closeWonOpportunityForInvoice: no opportunities for contact", contact_id);
    return { ok: false, reason: "no_opportunity" };
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, opportunity_id")
    .eq("id", document_id)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  let target = opportunities.find((o) => o.id === doc?.opportunity_id);
  if (!target) {
    target = opportunities[0];
  }

  const pipelineId = target.pipeline_id as string | null;
  let pipelineStages: PipelineStage[] = [];
  if (pipelineId) {
    const { data: pipeline } = await supabase
      .from("pipelines")
      .select("stages")
      .eq("id", pipelineId)
      .eq("user_id", workspaceOwnerId)
      .maybeSingle();
    pipelineStages = (pipeline?.stages as PipelineStage[]) ?? [];
  }

  const stageName = pipelineStages.find((s) => s.id === target!.stage)?.name;
  if (isWonPipelineStage(target.stage as string, stageName)) {
    if (!target.project_stage) {
      await maybeInitProjectStageOnWon(
        supabase,
        target as Record<string, unknown>,
        target.stage as string,
        pipelineStages
      );
    }
    return { ok: true, opportunity_id: target.id as string, already_won: true };
  }

  const wonStageId = findWonStageId(pipelineStages);
  if (!wonStageId) {
    console.warn("closeWonOpportunityForInvoice: no Won stage in pipeline", pipelineId);
    return { ok: false, reason: "no_won_stage" };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("opportunities")
    .update({
      stage: wonStageId,
      value: invoice_total,
      updated_at: now,
    })
    .eq("id", target.id)
    .eq("user_id", workspaceOwnerId)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("closeWonOpportunityForInvoice:", error?.message);
    return { ok: false, reason: error?.message ?? "update_failed" };
  }

  await maybeInitProjectStageOnWon(
    supabase,
    updated as Record<string, unknown>,
    wonStageId,
    pipelineStages
  );

  await logContactActivity(supabase, {
    userId: workspaceOwnerId,
    contactId: contact_id,
    type: "system",
    description: "Opportunity closed — invoice paid",
    metadata: {
      opportunity_id: target.id,
      document_id,
      invoice_total,
    },
  });

  return { ok: true, opportunity_id: target.id as string, already_won: false };
}
