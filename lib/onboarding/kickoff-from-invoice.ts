import type { SupabaseClient } from "@supabase/supabase-js";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { resolveContactCommunicationLocale } from "@/lib/contacts/communication-locale";
import { allocateCustomerId } from "@/lib/contacts/customer-id";
import {
  createOnboardingTasksFromTemplate,
  ensureContactOnboardingTokens,
} from "@/lib/onboarding/start";
import { resolveOnboardingTaskTemplate } from "@/lib/onboarding/defaults";
import {
  closeWonOpportunityForInvoice,
  type CloseWonResult,
} from "@/lib/opportunities/close-won";
import { createNotification } from "@/lib/notifications/create-notification";
import { listSalesGroupMemberIds } from "@/lib/notifications/workspace-groups";

export type KickoffFromInvoiceInput = {
  contact_id: string;
  document_id: string | null;
  invoice_total: number;
};

export type KickoffFromInvoiceResult = {
  ok: true;
  first_kickoff: boolean;
  onboarding_token: string;
  onboarding_url: string;
  locale: "en" | "es";
  contact_email: string | null;
  first_name: string;
  close_won: CloseWonResult | null;
};

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.clickin360.com"
  ).replace(/\/$/, "");
}

/** Idempotent CRM kickoff after first invoice payment (quote-type). */
export async function kickoffOnboardingFromInvoice(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: KickoffFromInvoiceInput
): Promise<KickoffFromInvoiceResult> {
  const { contact_id, document_id, invoice_total } = input;

  let closeWon: CloseWonResult | null = null;
  if (document_id) {
    closeWon = await closeWonOpportunityForInvoice(supabase, workspaceOwnerId, {
      contact_id,
      document_id,
      invoice_total,
    });
  }

  const now = new Date().toISOString();
  await supabase
    .from("contacts")
    .update({ status: "active", updated_at: now })
    .eq("id", contact_id)
    .eq("user_id", workspaceOwnerId);

  const { data: contact } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, preferred_language, onboarding_started_at"
    )
    .eq("id", contact_id)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!contact) {
    throw new Error("Contact not found");
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("onboarding_enabled, onboarding_task_template, ui_locale")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (settings?.onboarding_enabled === false) {
    throw new Error("Onboarding automation is disabled for this workspace.");
  }

  const tokens = await ensureContactOnboardingTokens(
    supabase,
    contact_id,
    workspaceOwnerId
  );

  const firstKickoff = !contact.onboarding_started_at;

  if (firstKickoff) {
    await supabase
      .from("contacts")
      .update({
        onboarding_started_at: now,
        onboarding_completed_at: null,
        updated_at: now,
      })
      .eq("id", contact_id)
      .eq("user_id", workspaceOwnerId);

    const template = resolveOnboardingTaskTemplate(
      settings?.onboarding_task_template
    );
    const taskLocale = settings?.ui_locale === "es" ? "es" : "en";
    await createOnboardingTasksFromTemplate(
      supabase,
      workspaceOwnerId,
      contact_id,
      template,
      taskLocale
    );

    await logContactActivity(supabase, {
      userId: workspaceOwnerId,
      contactId: contact_id,
      type: "system",
      description: "Onboarding started automatically",
      metadata: { source: "invoice.paid" },
    });

    const contactName =
      [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() ||
      "Customer";
    const memberIds = await listSalesGroupMemberIds(supabase, workspaceOwnerId);
    for (const memberId of memberIds) {
      await createNotification(supabase, memberId, {
        kind: "opportunity_reminder",
        title: `Onboarding started for ${contactName}`,
        message: "Invoice payment received.",
        related_entity_type: "contact",
        related_entity_id: contact_id,
      });
    }
  }

  const locale = resolveContactCommunicationLocale(contact.preferred_language);
  const onboardingUrl = `${appBaseUrl()}/onboarding/${tokens.onboarding_token}`;

  return {
    ok: true,
    first_kickoff: firstKickoff,
    onboarding_token: tokens.onboarding_token,
    onboarding_url: onboardingUrl,
    locale,
    contact_email: (contact.email as string | null) ?? null,
    first_name: (contact.first_name as string | null) ?? "there",
    close_won: closeWon,
  };
}

/** Assign CID when questionnaire is submitted (eligible after contact is active). */
export async function assignCustomerIdIfEligible(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  contactId: string
): Promise<string | null> {
  const { data: contact } = await supabase
    .from("contacts")
    .select("customer_id, status")
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!contact || contact.customer_id || contact.status !== "active") {
    return (contact?.customer_id as string | null) ?? null;
  }

  const customerId = await allocateCustomerId(supabase, workspaceOwnerId);
  const { data: updated } = await supabase
    .from("contacts")
    .update({ customer_id: customerId, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .is("customer_id", null)
    .select("customer_id")
    .maybeSingle();

  return (updated?.customer_id as string | null) ?? null;
}
