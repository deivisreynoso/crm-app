import type { SupabaseClient } from "@supabase/supabase-js";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { logTicketEmailNote } from "@/lib/activities/log-ticket-email-note";
import { saveContactEmail } from "@/lib/emails/save-contact-email";
import { getGoogleGmailConnectedEmail, sendGmailMessage } from "@/lib/google/gmail";
import { GOOGLE_REVIEWS_URL } from "@/lib/website/google-reviews-url";
import { defaultReviewTemplateContent } from "@/lib/reviews/default-review-template";
import { renderReviewEmail } from "@/lib/reviews/review-template-context";
import { resolveGmailSendOptions } from "@/lib/emails/build-gmail-send-options";
import { syncContactEmailsFromGmail } from "@/lib/google/gmail-sync";
import { triggerN8NWebhook } from "@/lib/n8n";
import type { CrmLocale } from "@/lib/crm/i18n";

export type SendReviewRequestResult =
  | { ok: true }
  | { ok: false; status: number; error: string; code?: string };

export async function sendReviewRequest(
  supabase: SupabaseClient,
  input: {
    actorUserId: string;
    workspaceOwnerId: string;
    contactId: string;
    ticketId?: string;
    uiLocale?: CrmLocale | null;
    subjectOverride?: string;
    bodyOverride?: string;
    cc?: string;
  }
): Promise<SendReviewRequestResult> {
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, phone, company, company_id, review_request_opt_out"
    )
    .eq("id", input.contactId)
    .eq("user_id", input.workspaceOwnerId)
    .maybeSingle();

  if (contactError || !contact) {
    return { ok: false, status: 404, error: "Contact not found" };
  }

  if (contact.review_request_opt_out) {
    return {
      ok: false,
      status: 400,
      error: "This contact opted out of review invitations.",
      code: "opt_out",
    };
  }

  const to = contact.email?.trim().toLowerCase();
  if (!to) {
    return {
      ok: false,
      status: 400,
      error: "Contact has no email address.",
      code: "no_email",
    };
  }

  if (input.ticketId) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("id, contact_id")
      .eq("id", input.ticketId)
      .eq("user_id", input.workspaceOwnerId)
      .maybeSingle();

    if (!ticket || ticket.contact_id !== input.contactId) {
      return { ok: false, status: 400, error: "Ticket is not linked to this contact." };
    }
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("google_reviews_url, review_request_template_id, ui_locale")
    .eq("user_id", input.workspaceOwnerId)
    .maybeSingle();

  const reviewUrl =
    settings?.google_reviews_url?.trim() || GOOGLE_REVIEWS_URL;
  if (!reviewUrl) {
    return {
      ok: false,
      status: 400,
      error: "Google review URL is not configured. Set it in Settings.",
      code: "no_review_url",
    };
  }

  let companyName: string | null = contact.company;
  if (!companyName && contact.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", contact.company_id)
      .eq("user_id", input.workspaceOwnerId)
      .maybeSingle();
    companyName = company?.name ?? null;
  }

  let rendered: { subject: string; body: string };

  if (input.subjectOverride && input.bodyOverride) {
    rendered = {
      subject: input.subjectOverride,
      body: input.bodyOverride,
    };
  } else {
    let subject = "";
    let body = "";
    const templateId = settings?.review_request_template_id as string | null;

    if (templateId) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("subject, body")
        .eq("id", templateId)
        .eq("user_id", input.workspaceOwnerId)
        .maybeSingle();

      if (template) {
        subject = template.subject;
        body = template.body;
      }
    }

    if (!subject || !body) {
      const locale =
        input.uiLocale ??
        (settings?.ui_locale === "en" || settings?.ui_locale === "es"
          ? settings.ui_locale
          : "en");
      const fallback = defaultReviewTemplateContent(locale);
      subject = fallback.subject;
      body = fallback.body;
    }

    rendered = renderReviewEmail({
      subject,
      body,
      contact,
      companyName,
      googleReviewUrl: reviewUrl,
    });
  }

  if (!rendered.subject.trim() || !rendered.body.trim()) {
    return { ok: false, status: 400, error: "Review email subject and body are required." };
  }

  const sendOptions = await resolveGmailSendOptions(input.actorUserId, {
    cc: input.cc,
  });

  const sent = await sendGmailMessage(input.actorUserId, {
    to,
    subject: rendered.subject,
    body: rendered.body,
    ...sendOptions,
  });

  if (!sent) {
    return {
      ok: false,
      status: 403,
      error:
        "Could not send email. Connect Gmail in Settings → Integrations.",
      code: "gmail_not_connected",
    };
  }

  const fromEmail = await getGoogleGmailConnectedEmail(input.actorUserId);
  const sentAt = new Date().toISOString();

  try {
    await saveContactEmail(supabase, {
      user_id: input.workspaceOwnerId,
      contact_id: input.contactId,
      ticket_id: input.ticketId ?? null,
      mailbox_user_id: input.actorUserId,
      direction: "outbound",
      gmail_message_id: sent.messageId,
      gmail_thread_id: sent.threadId ?? null,
      from_email: fromEmail,
      to_email: to,
      subject: rendered.subject,
      body: rendered.body,
      sent_at: sentAt,
    });
  } catch (err) {
    console.error("saveContactEmail after review request:", err);
  }

  await logContactActivity(supabase, {
    userId: input.workspaceOwnerId,
    createdBy: input.actorUserId,
    contactId: input.contactId,
    type: "review_request",
    description: `Google review invitation sent: ${rendered.subject}`,
    metadata: {
      google_review_url: reviewUrl,
      gmail_message_id: sent.messageId,
      ticket_id: input.ticketId ?? null,
    },
  });

  if (input.ticketId) {
    await logTicketEmailNote(supabase, {
      workspaceOwnerId: input.workspaceOwnerId,
      ticketId: input.ticketId,
      direction: "outbound",
      subject: `Review invitation: ${rendered.subject}`,
      body: rendered.body,
    });
  }

  await supabase
    .from("contacts")
    .update({
      review_requested_at: sentAt,
      updated_at: sentAt,
    })
    .eq("id", input.contactId)
    .eq("user_id", input.workspaceOwnerId);

  void syncContactEmailsFromGmail(
    input.actorUserId,
    input.workspaceOwnerId,
    input.contactId,
    to,
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || to
  ).catch((err) => {
    console.error("post-review email sync:", err);
  });

  void triggerN8NWebhook("review.requested", {
    contact_id: input.contactId,
    ticket_id: input.ticketId ?? null,
    to,
    subject: rendered.subject,
    google_review_url: reviewUrl,
  });

  return { ok: true };
}
