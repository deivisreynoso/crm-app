import type { SupabaseClient } from "@supabase/supabase-js";
import { DOCUMENTS_BUCKET, sanitizeFileName } from "@/lib/storage/documents";

export const QUOTE_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const QUOTE_LOGO_MAX_WIDTH = 400;
export const QUOTE_LOGO_MAX_HEIGHT = 120;
export const QUOTE_LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

export function quoteLogoStoragePath(userId: string, fileName: string): string {
  const ext = sanitizeFileName(fileName).split(".").pop() || "png";
  return `${userId}/branding/quote-logo.${ext}`;
}

export async function uploadQuoteLogo(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  if (!QUOTE_LOGO_ACCEPT.split(",").includes(file.type)) {
    throw new Error("Logo must be PNG, JPEG, or WebP.");
  }
  if (file.size > QUOTE_LOGO_MAX_BYTES) {
    throw new Error("Logo must be 2 MB or smaller.");
  }

  const storagePath = quoteLogoStoragePath(userId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(error.message);
  return storagePath;
}

export async function resolveQuoteLogoUrl(
  supabase: SupabaseClient,
  storagePath: string | null | undefined
): Promise<string | null> {
  if (!storagePath?.trim()) return null;
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath.trim(), SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
