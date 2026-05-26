import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants/pipelines";

/** Create the default sales pipeline when the workspace has none. */
export async function ensureDefaultPipeline(
  supabase: SupabaseClient,
  workspaceOwnerId: string
) {
  const { data: existing } = await supabase
    .from("pipelines")
    .select("id")
    .eq("user_id", workspaceOwnerId)
    .limit(1);

  if (existing?.length) {
    const { data } = await supabase
      .from("pipelines")
      .select("*")
      .eq("user_id", workspaceOwnerId)
      .order("created_at", { ascending: true });
    return data ?? [];
  }

  const { data: created, error } = await supabase
    .from("pipelines")
    .insert([
      {
        user_id: workspaceOwnerId,
        name: "Sales Pipeline",
        stages: DEFAULT_PIPELINE_STAGES,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return created ? [created] : [];
}
