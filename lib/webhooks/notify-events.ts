import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureContactOnboardingTokens } from "@/lib/onboarding/start";
import { fireWebhook } from "@/lib/webhooks/outbound";
import { resolveAdditionalContactsForWebhook } from "@/lib/calendar/event-attendees";

export async function notifyInvoicePaid(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "*, contact:contacts(id, first_name, last_name, email, phone, preferred_language, onboarding_token)"
    )
    .eq("id", invoiceId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!invoice) return;

  const contactId =
    typeof invoice.contact_id === "string" ? invoice.contact_id : null;
  const isQuoteInvoice =
    invoice.invoice_type === "quote" || Boolean(invoice.quote_id);

  let onboardingToken: string | null = null;

  if (contactId && isQuoteInvoice) {
    const tokens = await ensureContactOnboardingTokens(
      supabase,
      contactId,
      workspaceOwnerId
    );
    onboardingToken = tokens.onboarding_token;

    const nested = invoice.contact as Record<string, unknown> | null;
    if (nested && typeof nested === "object") {
      nested.onboarding_token = onboardingToken;
    }
  }

  void fireWebhook(supabase, workspaceOwnerId, "invoice.paid", {
    invoice_id: invoiceId,
    invoice,
    ...(onboardingToken ? { onboarding_token: onboardingToken } : {}),
    ...extra,
  });
}

export async function notifyAppointmentEvent(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  event: "appointment.created" | "appointment.updated" | "appointment.cancelled",
  calendarEvent: Record<string, unknown>
): Promise<void> {
  const eventId = calendarEvent.id as string | undefined;
  const primaryContactId = calendarEvent.contact_id as string | null | undefined;

  let contact: Record<string, unknown> | null = null;
  if (primaryContactId) {
    const { data: contactRow } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, preferred_language")
      .eq("id", primaryContactId)
      .eq("user_id", workspaceOwnerId)
      .maybeSingle();
    contact = (contactRow as Record<string, unknown> | null) ?? null;
  }

  const additional_contacts =
    eventId && event !== "appointment.cancelled"
      ? await resolveAdditionalContactsForWebhook(
          supabase,
          eventId,
          primaryContactId
        )
      : [];

  const enrichedEvent = {
    ...calendarEvent,
    ...(contact ? { contact } : {}),
    meet_link:
      calendarEvent.meet_link ??
      (calendarEvent.location_type === "google_meet"
        ? calendarEvent.location
        : null),
  };

  void fireWebhook(supabase, workspaceOwnerId, event, {
    calendar_event_id: calendarEvent.id,
    calendar_event: enrichedEvent,
    ...(contact ? { contact } : {}),
    ...(additional_contacts.length ? { additional_contacts } : {}),
  });
}
