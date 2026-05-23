import { createServerSideClient } from "@/lib/supabase";

async function fetchAccountOpportunities(
  supabase: ReturnType<typeof createServerSideClient>,
  userId: string,
  companyId: string
) {
  const { data: accountContacts } = await supabase
    .from("contacts")
    .select("id")
    .eq("company_id", companyId);

  const contactIds = (accountContacts ?? []).map((c) => c.id);

  let query = supabase
    .from("opportunities")
    .select("id, title, stage, value, currency, contact_id, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (contactIds.length) {
    query = query.or(
      `company_id.eq.${companyId},contact_id.in.(${contactIds.join(",")})`
    );
  } else {
    query = query.eq("company_id", companyId);
  }

  return await query;
}

export async function getCompanyRelated(userId: string, companyId: string) {
  const supabase = createServerSideClient();

  const [contacts, opportunities, tickets, documents, events] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, title, phone, status, created_at")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("last_name"),
    fetchAccountOpportunities(supabase, userId, companyId),
    supabase
      .from("tickets")
      .select("id, title, status, priority, contact_id, created_at")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("documents")
      .select("id, title, type, status, file_name, file_url, contact_id, created_at")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, contact_id, location")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("start_time", { ascending: false })
      .limit(10),
  ]);

  const contactIds = [
    ...new Set(
      [
        ...(tickets.data ?? []).map((t) => t.contact_id),
        ...(opportunities.data ?? []).map((o) => o.contact_id),
        ...(documents.data ?? []).map((d) => d.contact_id),
        ...(events.data ?? []).map((e) => e.contact_id),
      ].filter((id): id is string => !!id)
    ),
  ];

  let contactNameMap = new Map<string, string>();
  if (contactIds.length) {
    const { data: linked } = await supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .in("id", contactIds);
    contactNameMap = new Map(
      (linked ?? []).map((c) => [c.id, `${c.first_name} ${c.last_name}`])
    );
  }

  const withContactName = <T extends { contact_id?: string | null }>(rows: T[]) =>
    rows.map((r) => ({
      ...r,
      contact_name: r.contact_id
        ? contactNameMap.get(r.contact_id) ?? null
        : null,
    }));

  return {
    contacts: contacts.data ?? [],
    opportunities: withContactName(opportunities.data ?? []),
    tickets: withContactName(tickets.data ?? []),
    documents: withContactName(documents.data ?? []),
    calendar_events: withContactName(events.data ?? []),
  };
}
