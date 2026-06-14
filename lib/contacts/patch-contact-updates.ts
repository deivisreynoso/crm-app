import type { SupabaseClient } from "@supabase/supabase-js";
import { buildContactUpdate } from "@/lib/contact-payload";
import { finalizeContactCompanyUpdates } from "@/lib/contacts/resolve-company-display";
import type { ContactFormData } from "@/lib/validators";

export async function buildContactPatchUpdates(
  supabase: SupabaseClient,
  userId: string,
  data: Partial<ContactFormData>
): Promise<Record<string, unknown>> {
  const updates = buildContactUpdate(data);
  const companyUpdates = await finalizeContactCompanyUpdates(
    supabase,
    userId,
    data
  );
  return { ...updates, ...companyUpdates };
}
