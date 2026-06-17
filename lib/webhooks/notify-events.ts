import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureContactOnboardingTokens } from "@/lib/onboarding/start";
import { kickoffOnboardingFromInvoice } from "@/lib/onboarding/kickoff-from-invoice";
import { fireWebhook } from "@/lib/webhooks/outbound";
import { resolveAdditionalContactsForWebhook } from "@/lib/calendar/event-attendees";
import { buildAppointmentEmailLinks } from "@/lib/appointments/customer-facing-links";
import { resolveContactCommunicationLocale } from "@/lib/contacts/communication-locale";

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

  const meetLink =
    (calendarEvent.meet_link as string | null | undefined) ??
    (calendarEvent.location_type === "google_meet"
      ? (calendarEvent.location as string | null)
      : null);

  const { data: settings } = await supabase
    .from("user_settings")
    .select("quote_company_name, booking_availability")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  const bookingAvailability = settings?.booking_availability as
    | { timezone?: string }
    | null
    | undefined;

  const assignedTo = calendarEvent.assigned_to as string | null | undefined;
  let agentName = "ClickIn 360 Team";
  let agentEmail: string | null = null;
  if (assignedTo) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name, email")
      .eq("id", assignedTo)
      .maybeSingle();
    agentName =
      (profile?.display_name as string | null)?.trim() || agentName;
    agentEmail = (profile?.email as string | null) ?? null;
  }

  const locale = resolveContactCommunicationLocale(
    contact?.preferred_language as string | null | undefined
  );
  const siteBase =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.clickin360.com";
  const links = buildAppointmentEmailLinks({
    siteBaseUrl: siteBase,
    locale,
    eventId: eventId ?? null,
    contactEmail: (contact?.email as string | null | undefined) ?? null,
    supportEmail: agentEmail,
  });

  const enrichedEvent = {
    ...calendarEvent,
    ...(contact ? { contact } : {}),
    meet_link: meetLink,
  };

  void fireWebhook(supabase, workspaceOwnerId, event, {
    calendar_event_id: calendarEvent.id,
    calendar_event: enrichedEvent,
    ...(contact ? { contact } : {}),
    ...(additional_contacts.length ? { additional_contacts } : {}),
    appointment_email: {
      company_name:
        (settings?.quote_company_name as string | null)?.trim() || "ClickIn 360",
      agent_name: agentName,
      agent_email: agentEmail,
      timezone_label: (
        bookingAvailability?.timezone || "America/Mexico_City"
      ).replace(/_/g, " "),
      reschedule_link: links.reschedule_link,
      cancel_link: links.cancel_link,
      support_email: agentEmail || "support@clickin360.com",
      website: siteBase,
    },
  });
}
