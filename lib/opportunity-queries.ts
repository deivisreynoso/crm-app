import { createServerSideClient } from "@/lib/supabase";

const CONTACT_FIELDS =
  "id, first_name, last_name, email, company, company_id, tags";

const CONTACT_FIELDS_BASIC =
  "id, first_name, last_name, email, company";

async function fetchContact(
  supabase: ReturnType<typeof createServerSideClient>,
  contactId: string,
  workspaceOwnerId: string
) {
  const full = await supabase
    .from("contacts")
    .select(CONTACT_FIELDS)
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!full.error && full.data) return full.data;

  const basic = await supabase
    .from("contacts")
    .select(CONTACT_FIELDS_BASIC)
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (basic.error) {
    console.error("fetchContact:", basic.error.message);
    return null;
  }
  return basic.data;
}

async function resolveCompanyName(
  supabase: ReturnType<typeof createServerSideClient>,
  workspaceOwnerId: string,
  contact: { company?: string | null; company_id?: string | null }
) {
  let companyName = contact.company ?? undefined;
  if (!contact.company_id) return companyName;

  const { data: company, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", contact.company_id)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!error && company?.name) return company.name;
  return companyName;
}

export async function attachContactToOpportunity(
  opportunity: Record<string, unknown>
) {
  const supabase = createServerSideClient();
  const contactId = opportunity.contact_id as string;
  const workspaceOwnerId = opportunity.user_id as string | undefined;
  if (!contactId || !workspaceOwnerId) {
    return { ...opportunity, contact: null };
  }

  const contact = await fetchContact(supabase, contactId, workspaceOwnerId);

  if (!contact) return { ...opportunity, contact: null };

  const companyName = await resolveCompanyName(
    supabase,
    workspaceOwnerId,
    contact
  );

  return {
    ...opportunity,
    contact: { ...contact, company: companyName },
  };
}

export async function listOpportunitiesWithContacts(
  userId: string,
  options?: {
    pipelineId?: string;
    contactId?: string;
    stage?: string;
    search?: string;
    createdFrom?: string;
    createdTo?: string;
  }
) {
  const supabase = createServerSideClient();
  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const pipelineId = options?.pipelineId;
  const contactId = options?.contactId;

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }
  if (contactId) {
    query = query.eq("contact_id", contactId);
  }
  if (options?.stage) {
    query = query.eq("stage", options.stage);
  }
  if (options?.createdFrom) {
    query = query.gte("created_at", `${options.createdFrom}T00:00:00.000Z`);
  }
  if (options?.createdTo) {
    query = query.lte("created_at", `${options.createdTo}T23:59:59.999Z`);
  }

  const { data: opps, error } = await query;
  if (error) throw error;
  if (!opps?.length) return [];

  let filtered = opps;
  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    filtered = opps.filter((o) => o.title?.toLowerCase().includes(q));
  }
  if (!filtered.length) return [];

  const contactIds = [...new Set(filtered.map((o) => o.contact_id))];
  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select(CONTACT_FIELDS)
    .eq("user_id", userId)
    .in("id", contactIds);

  if (contactsError) {
    console.error("listOpportunities contacts fetch:", contactsError.message);
    return filtered.map((o) => ({ ...o, contact: null }));
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
      .eq("user_id", userId)
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

  return filtered.map((o) => ({
    ...o,
    contact: contactMap.get(o.contact_id) ?? null,
  }));
}
