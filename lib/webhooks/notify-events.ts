import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureContactOnboardingTokens } from "@/lib/onboarding/start";
import { kickoffOnboardingFromInvoice } from "@/lib/onboarding/kickoff-from-invoice";
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
  const paymentStatus = extra?.payment_status as string | undefined;
  const invoiceTotal =
    typeof extra?.invoice_total === "number"
      ? extra.invoice_total
      : Number(invoice.total ?? 0);
  const documentId =
    (invoice.quote_id as string | null | undefined)?.trim() || null;

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

    if (
      paymentStatus === "paid" ||
      paymentStatus === "partially_paid"
    ) {
      try {
        await kickoffOnboardingFromInvoice(supabase, workspaceOwnerId, {
          contact_id: contactId,
          document_id: documentId,
          invoice_total: invoiceTotal,
        });
      } catch (kickoffErr) {
        console.error("notifyInvoicePaid kickoff:", kickoffErr);
      }
    }
  }

  const contact =
    invoice.contact && typeof invoice.contact === "object"
      ? (invoice.contact as Record<string, unknown>)
      : null;

  void fireWebhook(supabase, workspaceOwnerId, "invoice.paid", {
    invoice_id: invoiceId,
    invoice,
    contact_id: contactId,
    contact,
    document_id: documentId,
    payment_status: paymentStatus ?? null,
    amount_paid: extra?.amount_paid ?? null,
    invoice_total: invoiceTotal,
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
