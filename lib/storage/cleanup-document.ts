import type { SupabaseClient } from "@supabase/supabase-js";
import { DOCUMENTS_BUCKET } from "@/lib/storage/documents";

/** Remove storage object when a document row is deleted. Best-effort. */
export async function deleteDocumentStorage(
  supabase: SupabaseClient,
  storagePath: string | null | undefined
): Promise<void> {
  const path = storagePath?.trim();
  if (!path) return;

  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
  if (error) {
    console.error("deleteDocumentStorage:", path, error.message);
  }
}
