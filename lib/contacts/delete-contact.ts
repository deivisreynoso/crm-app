import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Unlink rows that reference contacts/opportunities without ON DELETE CASCADE,
 * then delete the contact (cascades tickets, notes, opportunities, etc.).
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

  const unlinkByContact = async (table: "documents" | "payments" | "calendar_events") => {
    const { error } = await supabase
      .from(table)
      .update({ contact_id: null })
      .eq("contact_id", contactId)
      .eq("user_id", workspaceOwnerId);
    if (error) return error;
    return null;
  };

  const unlinkByOpportunities = async (table: "documents" | "payments" | "calendar_events") => {
    if (opportunityIds.length === 0) return null;
    const { error } = await supabase
      .from(table)
      .update({ opportunity_id: null })
      .in("opportunity_id", opportunityIds)
      .eq("user_id", workspaceOwnerId);
    if (error) return error;
    return null;
  };

  for (const table of ["documents", "payments", "calendar_events"] as const) {
    const contactErr = await unlinkByContact(table);
    if (contactErr) return { data: null, error: contactErr };
    const oppErr = await unlinkByOpportunities(table);
    if (oppErr) return { data: null, error: oppErr };
  }

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
