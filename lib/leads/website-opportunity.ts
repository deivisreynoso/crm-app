import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveQualifiedStageId } from "@/lib/pipelines/resolve-stage";

const CLOSED_STAGES = new Set(["closed_won", "closed_lost", "won", "lost"]);

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
    (row) => !CLOSED_STAGES.has(String(row.stage ?? "").toLowerCase())
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
