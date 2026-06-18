import { createServerSideClient } from "@/lib/supabase";
import { fetchContactRelatedCounts } from "@/lib/opportunities/contact-related-counts";
import type { TeamRole } from "@/lib/team/workspace";
import { applyOpportunityScope } from "@/lib/api/data-scope";
import { ilikePattern } from "@/lib/api/sanitize-search";

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
    includeContactCounts?: boolean;
    actorUserId?: string;
    role?: TeamRole;
    isWorkspaceOwner?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<{ data: Awaited<ReturnType<typeof enrichOpportunityRows>>; total?: number }> {
  const supabase = createServerSideClient();
  const paginate = options?.page !== undefined;
  const page = Math.max(1, options?.page ?? 1);
  const limit = paginate
    ? Math.min(100, Math.max(1, options?.limit ?? 25))
    : Math.min(1000, options?.limit ?? 1000);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("opportunities")
    .select("*", paginate ? { count: "exact" } : undefined)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!paginate) {
    query = query.limit(limit);
  }

  if (options?.actorUserId && options?.role) {
    query = applyOpportunityScope(
      query,
      options.role,
      Boolean(options.isWorkspaceOwner),
      options.actorUserId
    );
  }

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
  if (options?.search?.trim()) {
    query = query.ilike("title", ilikePattern(options.search.trim()));
  }

  if (paginate) {
    query = query.range(from, to);
  }

  const { data: opps, error, count } = await query;
  if (error) throw error;
  if (!opps?.length) {
    return { data: [], ...(paginate ? { total: count ?? 0 } : {}) };
  }

  const data = await enrichOpportunityRows(
    supabase,
    userId,
    opps,
    Boolean(options?.includeContactCounts)
  );
  return { data, ...(paginate ? { total: count ?? data.length } : {}) };
}

async function enrichOpportunityRows(
  supabase: ReturnType<typeof createServerSideClient>,
  userId: string,
  opps: Record<string, unknown>[],
  includeContactCounts: boolean
) {
  const contactIds = [...new Set(opps.map((o) => o.contact_id as string))];

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select(CONTACT_FIELDS)
    .eq("user_id", userId)
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

  let countsByContact = new Map<
    string,
    { quotes: number; appointments: number; tasks: number }
  >();
  if (includeContactCounts) {
    countsByContact = await fetchContactRelatedCounts(
      supabase,
      userId,
      contactIds
    );
  }

  return opps.map((o) => ({
    ...o,
    contact: contactMap.get(o.contact_id as string) ?? null,
    ...(includeContactCounts
      ? {
          contact_counts: countsByContact.get(o.contact_id as string) ?? {
            quotes: 0,
            appointments: 0,
            tasks: 0,
          },
        }
      : {}),
  }));
}
