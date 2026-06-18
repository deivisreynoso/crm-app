import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants/pipelines";

/** Resolve the qualified stage id from the workspace default pipeline. */
export async function resolveQualifiedStageId(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<string> {
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("stages")
    .eq("user_id", workspaceOwnerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const stages = (pipeline?.stages as { id: string; name: string }[] | null) ?? [];
  const byId = stages.find((s) => s.id === "qualified");
  if (byId) return byId.id;

  const byName = stages.find((s) => /qualified/i.test(s.name));
  if (byName) return byName.id;

  return DEFAULT_PIPELINE_STAGES.find((s) => s.id === "qualified")?.id ?? "qualified";
}
