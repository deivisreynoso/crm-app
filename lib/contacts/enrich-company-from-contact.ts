import type { SupabaseClient } from "@supabase/supabase-js";

/** Copy legacy company_id from the linked contact when not explicitly set. */
export async function enrichCompanyIdFromContact(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  contactId?: string | null,
  companyId?: string | null
): Promise<string | null> {
  const explicit = companyId?.trim();
  if (explicit) return explicit;

  const cid = contactId?.trim();
  if (!cid) return null;

  const { data: contact } = await supabase
    .from("contacts")
    .select("company_id")
    .eq("id", cid)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  const fromContact = contact?.company_id as string | undefined;
  return fromContact?.trim() ? fromContact : null;
}
