import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveQualifiedStageId } from "@/lib/pipelines/resolve-stage";
import {
  isLostStageId,
  isLostStageName,
  isWonStageName,
} from "@/lib/opportunities/stage-outcome";

const CLOSED_STAGE_IDS = new Set(["closed_won", "closed_lost", "won", "lost"]);

function isClosedOpportunityStage(stage: string | null | undefined): boolean {
  const raw = String(stage ?? "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (CLOSED_STAGE_IDS.has(lower)) return true;
  if (isLostStageId(raw) || isLostStageName(raw) || isWonStageName(raw)) {
    return true;
  }
  return false;
}

/** Reuse an open unassigned website opportunity or create one in Qualified. */
export async function findOrCreateWebsiteOpportunity(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  contactId: string,
  companyLabel: string,
  summary: string | null
): Promise<string | null> {
  const stageId = await resolveQualifiedStageId(supabase, workspaceOwnerId);

  const { data: existingRows } = await supabase
    .from("opportunities")
    .select("id, stage")
    .eq("user_id", workspaceOwnerId)
    .eq("contact_id", contactId)
    .is("owner_id", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const open = (existingRows ?? []).find(
    (row) => !isClosedOpportunityStage(String(row.stage ?? ""))
  );
  if (open?.id) return open.id as string;

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("user_id", workspaceOwnerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pipeline?.id) return null;

  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .insert([
      {
        user_id: workspaceOwnerId,
        contact_id: contactId,
        pipeline_id: pipeline.id,
        stage: stageId,
        title: `Discovery Call — ${companyLabel}`,
        notes: summary,
        owner_id: null,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("findOrCreateWebsiteOpportunity:", error.message);
    return null;
  }

  return (opportunity?.id as string) ?? null;
}
