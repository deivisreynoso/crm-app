import type { SupabaseClient } from "@supabase/supabase-js";

function preferNonEmpty<T>(primary: T, secondary: T): T {
  if (primary != null && primary !== "") return primary;
  if (secondary != null && secondary !== "") return secondary;
  return primary ?? secondary;
}

function mergeCustomFields(
  primary: Record<string, unknown> | null | undefined,
  secondary: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const a = primary && typeof primary === "object" ? primary : {};
  const b = secondary && typeof secondary === "object" ? secondary : {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const merged: Record<string, unknown> = {};

  for (const key of keys) {
    const pv = a[key];
    const sv = b[key];
    if (pv != null && pv !== "") merged[key] = pv;
    else if (sv != null && sv !== "") merged[key] = sv;
    else merged[key] = pv ?? sv;
  }

  return merged;
}

function mergeTags(primary?: string[] | null, secondary?: string[] | null) {
  return [...new Set([...(primary ?? []), ...(secondary ?? [])])];
}

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

  const { error: notesError } = await supabase
    .from("notes")
    .update({ entity_id: primaryId })
    .eq("user_id", userId)
    .eq("entity_type", "contact")
    .eq("entity_id", secondaryId);

  if (notesError) {
    throw new Error(`Failed to reassign notes: ${notesError.message}`);
  }

  const { error: dup1Error } = await supabase
    .from("duplicate_reviews")
    .update({ contact1_id: primaryId })
    .eq("user_id", userId)
    .eq("contact1_id", secondaryId);

  if (dup1Error) {
    throw new Error(`Failed to update duplicate reviews: ${dup1Error.message}`);
  }

  const { error: dup2Error } = await supabase
    .from("duplicate_reviews")
    .update({ contact2_id: primaryId })
    .eq("user_id", userId)
    .eq("contact2_id", secondaryId);

  if (dup2Error) {
    throw new Error(`Failed to update duplicate reviews: ${dup2Error.message}`);
  }
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
  source?: string | null;
  status?: string | null;
  platform?: string | null;
  friction_area?: string | null;
  communication_channels?: string | null;
  signals?: string | null;
  ai_summary?: string | null;
  preferred_contact_method?: string | null;
  preferred_language?: string | null;
  website?: string | null;
  date_of_birth?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  timezone?: string | null;
  assigned_to?: string | null;
  custom_fields?: Record<string, unknown> | null;
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

  const mergedTags = mergeTags(primary.tags, secondary.tags);
  const notes = [primary.notes, secondary.notes].filter(Boolean).join("\n\n---\n\n");
  const mergedCustomFields = mergeCustomFields(
    primary.custom_fields,
    secondary.custom_fields
  );
  const mergedAiSummary = [primary.ai_summary, secondary.ai_summary]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const { error: updateError } = await supabase
    .from("contacts")
    .update({
      first_name: preferNonEmpty(primary.first_name, secondary.first_name),
      last_name: preferNonEmpty(primary.last_name, secondary.last_name),
      email: preferNonEmpty(primary.email, secondary.email),
      phone: preferNonEmpty(primary.phone, secondary.phone),
      company: preferNonEmpty(primary.company, secondary.company),
      title: preferNonEmpty(primary.title, secondary.title),
      company_id: preferNonEmpty(primary.company_id, secondary.company_id),
      source: preferNonEmpty(primary.source, secondary.source),
      status: preferNonEmpty(primary.status, secondary.status),
      platform: preferNonEmpty(primary.platform, secondary.platform),
      friction_area: preferNonEmpty(primary.friction_area, secondary.friction_area),
      communication_channels: preferNonEmpty(
        primary.communication_channels,
        secondary.communication_channels
      ),
      signals: preferNonEmpty(primary.signals, secondary.signals),
      ai_summary: mergedAiSummary || preferNonEmpty(primary.ai_summary, secondary.ai_summary),
      preferred_contact_method: preferNonEmpty(
        primary.preferred_contact_method,
        secondary.preferred_contact_method
      ),
      preferred_language: preferNonEmpty(
        primary.preferred_language,
        secondary.preferred_language
      ),
      website: preferNonEmpty(primary.website, secondary.website),
      date_of_birth: preferNonEmpty(primary.date_of_birth, secondary.date_of_birth),
      street_address: preferNonEmpty(primary.street_address, secondary.street_address),
      city: preferNonEmpty(primary.city, secondary.city),
      state: preferNonEmpty(primary.state, secondary.state),
      postal_code: preferNonEmpty(primary.postal_code, secondary.postal_code),
      country: preferNonEmpty(primary.country, secondary.country),
      timezone: preferNonEmpty(primary.timezone, secondary.timezone),
      assigned_to: preferNonEmpty(primary.assigned_to, secondary.assigned_to),
      notes: notes || primary.notes,
      tags: mergedTags,
      custom_fields: mergedCustomFields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", primaryId)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await reassignContactRelations(supabase, userId, primaryId, secondaryId);

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
