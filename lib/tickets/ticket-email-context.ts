import type { SupabaseClient } from "@supabase/supabase-js";

export type TicketEmailContact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  company_id: string | null;
};

export type TicketEmailContext = {
  ticket: {
    id: string;
    contact_id: string | null;
    subject?: string | null;
    ticket_number?: string | null;
  };
  contact: TicketEmailContact | null;
};

export async function loadTicketEmailContext(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  ticketId: string
): Promise<TicketEmailContext | null> {
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, contact_id, subject, ticket_number")
    .eq("id", ticketId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (error || !ticket) return null;

  if (!ticket.contact_id) {
    return { ticket, contact: null };
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, company, company_id")
    .eq("id", ticket.contact_id)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  return { ticket, contact: contact ?? null };
}
