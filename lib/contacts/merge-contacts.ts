import type { SupabaseClient } from "@supabase/supabase-js";

/** Reassign all related records from secondary contact to primary before delete. */
export async function reassignContactRelations(
  supabase: SupabaseClient,
  userId: string,
  primaryId: string,
  secondaryId: string
) {
  const tables = [
    "opportunities",
    "tickets",
    "documents",
    "calendar_events",
    "activities",
    "tasks",
    "payments",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .update({ contact_id: primaryId })
      .eq("user_id", userId)
      .eq("contact_id", secondaryId);
    if (error && !/does not exist|column/i.test(error.message)) {
      throw new Error(`Failed to reassign ${table}: ${error.message}`);
    }
  }

  await supabase
    .from("notes")
    .update({ entity_id: primaryId })
    .eq("user_id", userId)
    .eq("entity_type", "contact")
    .eq("entity_id", secondaryId);

  await supabase
    .from("duplicate_reviews")
    .update({ contact1_id: primaryId })
    .eq("user_id", userId)
    .eq("contact1_id", secondaryId);
  await supabase
    .from("duplicate_reviews")
    .update({ contact2_id: primaryId })
    .eq("user_id", userId)
    .eq("contact2_id", secondaryId);
}

export type ContactRow = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  company_id?: string | null;
  [key: string]: unknown;
};

/** Merge secondary into primary, reassign FKs, delete secondary. */
export async function mergeContacts(
  supabase: SupabaseClient,
  userId: string,
  primary: ContactRow,
  secondary: ContactRow
) {
  const primaryId = primary.id;
  const secondaryId = secondary.id;

  await reassignContactRelations(supabase, userId, primaryId, secondaryId);

  const mergedTags = [
    ...new Set([...(primary.tags ?? []), ...(secondary.tags ?? [])]),
  ];
  const notes = [primary.notes, secondary.notes].filter(Boolean).join("\n\n---\n\n");

  const { error: updateError } = await supabase
    .from("contacts")
    .update({
      email: primary.email || secondary.email,
      phone: primary.phone || secondary.phone,
      company: primary.company || secondary.company,
      title: primary.title || secondary.title,
      company_id: primary.company_id || secondary.company_id,
      notes: notes || primary.notes,
      tags: mergedTags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", primaryId)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .eq("id", secondaryId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return primaryId;
}
