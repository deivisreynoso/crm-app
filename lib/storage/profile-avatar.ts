import type { SupabaseClient } from "@supabase/supabase-js";
import { DOCUMENTS_BUCKET, sanitizeFileName } from "@/lib/storage/documents";

export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_AVATAR_ACCEPT = "image/png,image/jpeg,image/webp";

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

export function profileAvatarStoragePath(userId: string, fileName: string): string {
  const ext = sanitizeFileName(fileName).split(".").pop() || "png";
  return `${userId}/profile/avatar.${ext}`;
}

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  if (!PROFILE_AVATAR_ACCEPT.split(",").includes(file.type)) {
    throw new Error("Photo must be PNG, JPEG, or WebP.");
  }
  if (file.size > PROFILE_AVATAR_MAX_BYTES) {
    throw new Error("Photo must be 2 MB or smaller.");
  }

  const storagePath = profileAvatarStoragePath(userId, file.name);
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

export async function resolveProfileAvatarUrl(
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
