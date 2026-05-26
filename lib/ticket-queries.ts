import { createServerSideClient } from "@/lib/supabase";

export async function enrichTicket(ticket: Record<string, unknown>) {
  const supabase = createServerSideClient();
  let contact = null;
  let company = null;

  if (ticket.contact_id) {
    const { data } = await supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, email, review_request_opt_out, review_requested_at"
      )
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

export async function listTicketsEnriched(
  userId: string,
  filters?: {
    contact_id?: string;
    company_id?: string;
    status?: string;
    created_from?: string;
    created_to?: string;
  }
) {
  const supabase = createServerSideClient();
  let query = supabase
    .from("tickets")
    .select("*")
    .eq("user_id", userId)
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

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return [];

  return Promise.all(data.map((t) => enrichTicket(t)));
}
