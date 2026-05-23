import type { z } from "zod";
import type { documentCreateSchema } from "@/lib/validators";

type DocumentCreateData = z.infer<typeof documentCreateSchema>;

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export function buildDocumentRecord(
  data: DocumentCreateData,
  userId: string,
  fileMeta?: {
    file_url: string;
    file_name: string;
    mime_type?: string;
    file_size_bytes?: number;
    storage_path?: string;
  }
) {
  return {
    user_id: userId,
    contact_id: data.contact_id?.trim() ? data.contact_id : null,
    company_id: data.company_id?.trim() ? data.company_id : null,
    opportunity_id: data.opportunity_id?.trim() ? data.opportunity_id : null,
    type: data.type,
    title: data.title.trim(),
    content: emptyToNull(data.content),
    status: data.status ?? "draft",
    file_url: fileMeta?.file_url ?? null,
    file_name: fileMeta?.file_name ?? null,
    mime_type: fileMeta?.mime_type ?? null,
    file_size_bytes: fileMeta?.file_size_bytes ?? null,
    storage_path: fileMeta?.storage_path ?? null,
  };
}
