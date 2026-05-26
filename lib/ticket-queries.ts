import { createServerSideClient } from "@/lib/supabase";

const CONTACT_FIELDS =
  "id, first_name, last_name, email, review_request_opt_out, review_requested_at";

function enrichTicketWithMaps(
  ticket: Record<string, unknown>,
  maps: {
    contacts: Map<string, Record<string, unknown>>;
    companies: Map<string, Record<string, unknown>>;
  }
) {
  const contactId = ticket.contact_id as string | undefined;
  const companyId = ticket.company_id as string | undefined;
  return {
    ...ticket,
    contact: contactId ? maps.contacts.get(contactId) ?? null : null,
    company: companyId ? maps.companies.get(companyId) ?? null : null,
  };
}

export async function enrichTicket(
  ticket: Record<string, unknown>,
  maps?: {
    contacts: Map<string, Record<string, unknown>>;
    companies: Map<string, Record<string, unknown>>;
  }
) {
  if (maps) {
    return enrichTicketWithMaps(ticket, maps);
  }

  const supabase = createServerSideClient();
  let contact = null;
  let company = null;

  if (ticket.contact_id) {
    const { data } = await supabase
      .from("contacts")
      .select(CONTACT_FIELDS)
      .eq("id", ticket.contact_id as string)
      .maybeSingle();
    contact = data;
  }

  if (ticket.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", ticket.company_id as string)
      .maybeSingle();
    company = data;
  }

  return { ...ticket, contact, company };
}

async function loadContactCompanyMaps(
  supabase: ReturnType<typeof createServerSideClient>,
  workspaceOwnerId: string,
  tickets: Record<string, unknown>[]
) {
  const contactIds = [
    ...new Set(
      tickets
        .map((t) => t.contact_id as string | undefined)
        .filter((id): id is string => !!id)
    ),
  ];
  const companyIds = [
    ...new Set(
      tickets
        .map((t) => t.company_id as string | undefined)
        .filter((id): id is string => !!id)
    ),
  ];

  const contacts = new Map<string, Record<string, unknown>>();
  const companies = new Map<string, Record<string, unknown>>();

  if (contactIds.length) {
    const { data } = await supabase
      .from("contacts")
      .select(CONTACT_FIELDS)
      .eq("user_id", workspaceOwnerId)
      .in("id", contactIds);
    for (const row of data ?? []) {
      contacts.set(row.id as string, row);
    }
  }

  if (companyIds.length) {
    const { data } = await supabase
      .from("companies")
      .select("id, name")
      .eq("user_id", workspaceOwnerId)
      .in("id", companyIds);
    for (const row of data ?? []) {
      companies.set(row.id as string, row);
    }
  }

  return { contacts, companies };
}

export async function listTicketsEnriched(
  workspaceOwnerId: string,
  filters?: {
    contact_id?: string;
    company_id?: string;
    status?: string;
    created_from?: string;
    created_to?: string;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(1, filters?.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters?.limit ?? 50));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = createServerSideClient();
  let query = supabase
    .from("tickets")
    .select("*", { count: "exact" })
    .eq("user_id", workspaceOwnerId)
    .order("created_at", { ascending: false });

  if (filters?.contact_id) query = query.eq("contact_id", filters.contact_id);
  if (filters?.company_id) query = query.eq("company_id", filters.company_id);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.created_from) {
    query = query.gte("created_at", `${filters.created_from}T00:00:00.000Z`);
  }
  if (filters?.created_to) {
    query = query.lte("created_at", `${filters.created_to}T23:59:59.999Z`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  if (!data?.length) {
    return { data: [], total: count ?? 0, page, limit };
  }

  const maps = await loadContactCompanyMaps(supabase, workspaceOwnerId, data);
  const enriched = data.map((t) => enrichTicketWithMaps(t, maps));

  return {
    data: enriched,
    total: count ?? data.length,
    page,
    limit,
  };
}
