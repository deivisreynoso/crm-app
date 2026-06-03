import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Remove dependent records tied to a contact, then delete the contact.
 * DB CASCADE handles opportunities, tickets, activities, tasks, contact_emails, calendar_events (035).
 * Documents/payments use SET NULL on contact_id — deleted explicitly here.
 * Notes use polymorphic entity_id — deleted explicitly and via migration 036 trigger.
 */
export async function deleteContactWithDependents(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  contactId: string
): Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }> {
  const { data: contact, error: loadError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (loadError) {
    return { data: null, error: loadError };
  }
  if (!contact) {
    return { data: null, error: { message: "Contact not found", code: "NOT_FOUND" } };
  }

  const { data: opportunities, error: oppError } = await supabase
    .from("opportunities")
    .select("id")
    .eq("contact_id", contactId)
    .eq("user_id", workspaceOwnerId);

  if (oppError) {
    return { data: null, error: oppError };
  }

  const opportunityIds = (opportunities ?? []).map((o) => o.id as string);

  const deleteByContact = async (table: "calendar_events" | "documents" | "payments") => {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("contact_id", contactId)
      .eq("user_id", workspaceOwnerId);
    if (error) return error;
    return null;
  };

  const deleteDocsByOpportunities = async () => {
    if (opportunityIds.length === 0) return null;
    const { error } = await supabase
      .from("documents")
      .delete()
      .in("opportunity_id", opportunityIds)
      .eq("user_id", workspaceOwnerId);
    if (error) return error;
    return null;
  };

  const deletePaymentsByOpportunities = async () => {
    if (opportunityIds.length === 0) return null;
    const { error } = await supabase
      .from("payments")
      .delete()
      .in("opportunity_id", opportunityIds)
      .eq("user_id", workspaceOwnerId);
    if (error) return error;
    return null;
  };

  for (const table of ["calendar_events", "documents", "payments"] as const) {
    const err = await deleteByContact(table);
    if (err) return { data: null, error: err };
  }

  const docOppErr = await deleteDocsByOpportunities();
  if (docOppErr) return { data: null, error: docOppErr };

  const payOppErr = await deletePaymentsByOpportunities();
  if (payOppErr) return { data: null, error: payOppErr };

  const { error: notesError } = await supabase
    .from("notes")
    .delete()
    .eq("entity_type", "contact")
    .eq("entity_id", contactId)
    .eq("user_id", workspaceOwnerId);
  if (notesError) return { data: null, error: notesError };

  const { data: deleted, error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .select()
    .maybeSingle();

  if (deleteError) {
    return { data: null, error: deleteError };
  }
  if (!deleted) {
    return { data: null, error: { message: "Contact not found", code: "NOT_FOUND" } };
  }

  return { data: deleted as Record<string, unknown>, error: null };
}
