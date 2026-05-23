import type { SupabaseClient } from "@supabase/supabase-js";

export const DOCUMENTS_BUCKET = "crm_documents";

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadToDocumentsBucket(
  supabase: SupabaseClient,
  userId: string,
  docId: string,
  file: File
): Promise<{
  storagePath: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${userId}/${docId}/${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);

  if (signError || !signed?.signedUrl) {
    const { data: pub } = supabase.storage
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(storagePath);
    return {
      storagePath,
      fileUrl: pub.publicUrl,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
  }

  return {
    storagePath,
    fileUrl: signed.signedUrl,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

export async function resolveDocumentFileUrl(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
  fallbackUrl: string | null | undefined
): Promise<string | null> {
  if (!storagePath?.trim()) return fallbackUrl ?? null;

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath.trim(), SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) return fallbackUrl ?? null;
  return data.signedUrl;
}
