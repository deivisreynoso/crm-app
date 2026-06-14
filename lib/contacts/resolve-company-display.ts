import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactFormData } from "@/lib/validators";

type ContactCompanyFields = {
  company_id?: string | null;
  company?: string | null;
};

export function resolveContactCompanyName(
  contact: ContactCompanyFields,
  companyMap: Map<string, string>
): string | null {
  if (contact.company_id) {
    return companyMap.get(contact.company_id) ?? contact.company ?? null;
  }
  return contact.company ?? null;
}

export async function loadCompanyNameMap(
  supabase: SupabaseClient,
  userId: string,
  companyIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniqueIds = [...new Set(companyIds.filter(Boolean))];
  if (!uniqueIds.length) return map;

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", userId)
    .in("id", uniqueIds);

  if (error || !companies) return map;

  for (const company of companies) {
    map.set(company.id, company.name);
  }
  return map;
}

export function enrichContactsWithCompanyNames<T extends ContactCompanyFields>(
  contacts: T[],
  companyMap: Map<string, string>
): T[] {
  return contacts.map((contact) => ({
    ...contact,
    company: resolveContactCompanyName(contact, companyMap),
  }));
}

export async function enrichContactsCompanyNamesFromDb<
  T extends ContactCompanyFields,
>(supabase: SupabaseClient, userId: string, contacts: T[]): Promise<T[]> {
  const companyIds = contacts
    .map((contact) => contact.company_id)
    .filter((id): id is string => !!id);
  const companyMap = await loadCompanyNameMap(supabase, userId, companyIds);
  return enrichContactsWithCompanyNames(contacts, companyMap);
}

/** Keep linked account name and free-text company field in sync on PATCH. */
export async function finalizeContactCompanyUpdates(
  supabase: SupabaseClient,
  userId: string,
  data: Partial<ContactFormData>
): Promise<Record<string, unknown>> {
  const extra: Record<string, unknown> = {};

  // Free-text company edits (edit form) take precedence over a stale company_id
  // that may still be present in the payload from form defaultValues.
  if (data.company !== undefined) {
    extra.company_id = null;
    return extra;
  }

  if (data.company_id !== undefined) {
    const linkedId = data.company_id?.trim() || null;
    if (linkedId) {
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", linkedId)
        .eq("user_id", userId)
        .maybeSingle();
      if (company?.name) extra.company = company.name;
    }
    return extra;
  }

  return extra;
}
