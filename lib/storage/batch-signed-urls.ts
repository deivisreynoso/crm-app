import type { SupabaseClient } from "@supabase/supabase-js";
import { DOCUMENTS_BUCKET } from "@/lib/storage/documents";

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

export async function batchResolveDocumentFileUrls(
  supabase: SupabaseClient,
  rows: Array<{ storage_path?: string | null; file_url?: string | null }>
): Promise<(string | null)[]> {
  const paths = rows.map((r) => r.storage_path?.trim() || null);
  const uniquePaths = [...new Set(paths.filter((p): p is string => !!p))];

  const signedByPath = new Map<string, string | null>();

  if (uniquePaths.length > 0) {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrls(uniquePaths, SIGNED_URL_TTL_SEC);

    if (error) {
      console.error("batchResolveDocumentFileUrls:", error.message);
    } else {
      for (const item of data ?? []) {
        signedByPath.set(item.path ?? "", item.signedUrl ?? null);
      }
    }
  }

  return rows.map((row, i) => {
    const path = paths[i];
    if (path && signedByPath.has(path)) {
      return signedByPath.get(path) ?? row.file_url ?? null;
    }
    return row.file_url ?? null;
  });
}
