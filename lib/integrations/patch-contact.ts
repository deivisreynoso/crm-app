import type { SupabaseClient } from "@supabase/supabase-js";
import { buildContactPatchUpdates } from "@/lib/contacts/patch-contact-updates";
import { enrichContactsCompanyNamesFromDb } from "@/lib/contacts/resolve-company-display";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import {
  duplicateContactMessage,
  findDuplicateContact,
} from "@/lib/identity/contact-duplicate";
import { contactWriteErrorMessage } from "@/lib/identity/duplicate-errors";
import { triggerN8NWebhook } from "@/lib/n8n";
import { contactPatchSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

export type PatchContactResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string; details?: unknown; hint?: string };

async function patchContactRow(
  supabase: SupabaseClient,
  id: string,
  workspaceOwnerId: string,
  updates: Record<string, unknown>
) {
  return supabase
    .from("contacts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", workspaceOwnerId)
    .select()
    .single();
}

export async function patchContactForIntegration(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  id: string,
  body: unknown
): Promise<PatchContactResult> {
  const parsed = contactPatchSchema.safeParse(body);
  if (!parsed.success) {
    const detailStr = formatValidationDetails(parsed.error.flatten());
    return {
      ok: false,
      status: 400,
      error: detailStr || "Validation failed",
      details: parsed.error.flatten(),
    };
  }

  if (parsed.data.email !== undefined || parsed.data.phone !== undefined) {
    const duplicate = await findDuplicateContact(supabase, workspaceOwnerId, {
      email: parsed.data.email,
      phone: parsed.data.phone,
      excludeId: id,
    });
    if (duplicate) {
      return {
        ok: false,
        status: 409,
        error: duplicateContactMessage(duplicate),
      };
    }
  }

  const baseUpdates = {
    ...(await buildContactPatchUpdates(
      supabase,
      workspaceOwnerId,
      parsed.data
    )),
    updated_at: new Date().toISOString(),
  };

  let { data, error: dbError } = await patchContactRow(
    supabase,
    id,
    workspaceOwnerId,
    baseUpdates
  );

  if (
    dbError &&
    "country" in baseUpdates &&
    /country/i.test(dbError.message)
  ) {
    const { country: _c, ...withoutCountry } = baseUpdates;
    ({ data, error: dbError } = await patchContactRow(
      supabase,
      id,
      workspaceOwnerId,
      withoutCountry
    ));
  }

  if (dbError) {
    return {
      ok: false,
      status: 500,
      error: humanizeDbError(contactWriteErrorMessage(dbError)),
      hint: /country/i.test(dbError.message)
        ? "Run migrations/009_contact_country.sql in Supabase if updating country."
        : undefined,
    };
  }

  if (!data) {
    return { ok: false, status: 404, error: "Contact not found" };
  }

  await triggerN8NWebhook("contact.updated", data);

  const changedKeys = Object.keys(parsed.data).filter(
    (k) => parsed.data[k as keyof typeof parsed.data] !== undefined
  );
  if (changedKeys.length > 0) {
    await logContactActivity(supabase, {
      userId: workspaceOwnerId,
      contactId: id,
      type: "update",
      description: `Contact updated (integration): ${changedKeys.slice(0, 5).join(", ")}${changedKeys.length > 5 ? "…" : ""}`,
      metadata: { fields: changedKeys, source: "integration_api" },
    });
  }

  const [enriched] = await enrichContactsCompanyNamesFromDb(
    supabase,
    workspaceOwnerId,
    [data as { company_id?: string | null; company?: string | null }]
  );

  return { ok: true, data: enriched as Record<string, unknown> };
}
