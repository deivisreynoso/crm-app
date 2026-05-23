import type { SupabaseClient } from "@supabase/supabase-js";

export async function snapshotDocumentVersion(
  supabase: SupabaseClient,
  userId: string,
  document: {
    id: string;
    content?: string | null;
    file_url?: string | null;
    storage_path?: string | null;
  }
) {
  const { data: latest } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_id", document.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version_number ?? 0) + 1;

  await supabase.from("document_versions").insert({
    document_id: document.id,
    user_id: userId,
    version_number: nextVersion,
    content: document.content ?? null,
    file_url: document.file_url ?? null,
    storage_path: document.storage_path ?? null,
  });
}
