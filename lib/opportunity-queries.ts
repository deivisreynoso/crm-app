import { createServerSideClient } from "@/lib/supabase";

const CONTACT_FIELDS =
  "id, first_name, last_name, email, company, company_id, tags";

const CONTACT_FIELDS_BASIC =
  "id, first_name, last_name, email, company";

async function fetchContact(
  supabase: ReturnType<typeof createServerSideClient>,
  contactId: string
) {
  const full = await supabase
    .from("contacts")
    .select(CONTACT_FIELDS)
    .eq("id", contactId)
    .maybeSingle();

  if (!full.error && full.data) return full.data;

  const basic = await supabase
    .from("contacts")
    .select(CONTACT_FIELDS_BASIC)
    .eq("id", contactId)
    .maybeSingle();

  if (basic.error) {
    console.error("fetchContact:", basic.error.message);
    return null;
  }
  return basic.data;
}

async function resolveCompanyName(
  supabase: ReturnType<typeof createServerSideClient>,
  contact: { company?: string | null; company_id?: string | null }
) {
  let companyName = contact.company ?? undefined;
  if (!contact.company_id) return companyName;

  const { data: company, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", contact.company_id)
    .maybeSingle();

  if (!error && company?.name) return company.name;
  return companyName;
}

export async function attachContactToOpportunity(
  opportunity: Record<string, unknown>
) {
  const supabase = createServerSideClient();
  const contactId = opportunity.contact_id as string;
  if (!contactId) return { ...opportunity, contact: null };

  const contact = await fetchContact(supabase, contactId);

  if (!contact) return { ...opportunity, contact: null };

  const companyName = await resolveCompanyName(supabase, contact);

  return {
    ...opportunity,
    contact: { ...contact, company: companyName },
  };
}

export async function listOpportunitiesWithContacts(
  userId: string,
  pipelineId?: string,
  contactId?: string
) {
  const supabase = createServerSideClient();
  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }
  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  const { data: opps, error } = await query;
  if (error) throw error;
  if (!opps?.length) return [];

  const contactIds = [...new Set(opps.map((o) => o.contact_id))];
  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select(CONTACT_FIELDS)
    .in("id", contactIds);

  if (contactsError) {
    console.error("listOpportunities contacts fetch:", contactsError.message);
    return opps.map((o) => ({ ...o, contact: null }));
  }

  const companyIds = [
    ...new Set(
      (contacts ?? [])
        .map((c) => c.company_id)
        .filter((id): id is string => !!id)
    ),
  ];

  const companyMap = new Map<string, string>();
  if (companyIds.length) {
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds);

    if (!companiesError && companies) {
      for (const c of companies) {
        companyMap.set(c.id, c.name);
      }
    }
  }

  const contactMap = new Map(
    (contacts ?? []).map((c) => [
      c.id,
      {
        ...c,
        company: c.company_id
          ? companyMap.get(c.company_id) ?? c.company
          : c.company,
      },
    ])
  );

  return opps.map((o) => ({
    ...o,
    contact: contactMap.get(o.contact_id) ?? null,
  }));
}
