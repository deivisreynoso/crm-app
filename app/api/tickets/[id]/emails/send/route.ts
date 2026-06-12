import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { gmailSendSchema } from "@/lib/validators";
import { formatValidationDetails } from "@/lib/validation-errors";
import { getGoogleGmailConnectedEmail, sendGmailMessage } from "@/lib/google/gmail";
import { saveContactEmail } from "@/lib/emails/save-contact-email";
import { logEmailContactActivity } from "@/lib/activities/log-email-activity";
import { logTicketEmailNote } from "@/lib/activities/log-ticket-email-note";
import { loadTicketEmailContext } from "@/lib/tickets/ticket-email-context";
import { syncContactEmailsFromGmail } from "@/lib/google/gmail-sync";
import { resolveGmailSendOptions } from "@/lib/emails/build-gmail-send-options";
import { triggerN8NWebhook } from "@/lib/n8n";
import {
  buildTemplateContext,
  interpolateTemplate,
} from "@/lib/documents/template-variables";
import { appendEmailSignature } from "@/lib/email/signature";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id: ticketId } = await context.params;
    const body = await req.json();
    const parsed = gmailSendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationDetails(parsed.error) },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const ctx = await loadTicketEmailContext(supabase, workspaceOwnerId!, ticketId);

    if (!ctx) {
      return NextResponse.json({ error: "Service ticket not found" }, { status: 404 });
    }

    if (!ctx.contact) {
      return NextResponse.json(
        { error: "Link a contact to this ticket before sending email." },
        { status: 400 }
      );
    }

    const contact = ctx.contact;
    const contactId = contact.id;

    let subject = parsed.data.subject?.trim() ?? "";
    let emailBody = parsed.data.body?.trim() ?? "";
    const to = parsed.data.to.trim().toLowerCase();

    if (parsed.data.template_id) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("subject, body")
        .eq("id", parsed.data.template_id)
        .eq("user_id", workspaceOwnerId!)
        .maybeSingle();

      if (!template) {
        return NextResponse.json(
          { error: "Email template not found" },
          { status: 404 }
        );
      }

      let companyName: string | null = contact.company;
      if (!companyName && contact.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", contact.company_id)
          .eq("user_id", workspaceOwnerId!)
          .maybeSingle();
        companyName = company?.name ?? null;
      }

      const templateCtx = buildTemplateContext({
        contact: {
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email ?? undefined,
          phone: contact.phone ?? undefined,
          company: contact.company ?? undefined,
        },
        company: companyName ? { name: companyName } : null,
      });

      if (!subject) subject = interpolateTemplate(template.subject, templateCtx);
      if (!emailBody) emailBody = interpolateTemplate(template.body, templateCtx);
    }

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "Subject and message body are required" },
        { status: 400 }
      );
    }

    if (!parsed.data.skip_signature_append) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email_signature_html")
        .eq("id", userId!)
        .maybeSingle();
      emailBody = appendEmailSignature(
        emailBody,
        profile?.email_signature_html as string | null | undefined
      );
    }

    const attachments: import("@/lib/google/gmail-attachments").GmailAttachment[] =
      (parsed.data.attachments ?? []).map((a) => ({
        filename: a.filename,
        mimeType: a.mime_type,
        content: Buffer.from(a.content_base64, "base64"),
      }));

    const sendOptions = await resolveGmailSendOptions(userId!, {
      cc: parsed.data.cc,
      bcc: parsed.data.bcc,
      reply_to_gmail_message_id: parsed.data.reply_to_gmail_message_id,
    });

    const sent = await sendGmailMessage(userId!, {
      to,
      subject,
      body: emailBody,
      attachments: attachments.length ? attachments : undefined,
      ...sendOptions,
    });

    if (!sent) {
      return NextResponse.json(
        {
          error:
            "Could not send email. Connect your Google Workspace or Gmail account in Settings → Integrations.",
          needs_gmail_connect: true,
        },
        { status: 403 }
      );
    }

    const fromEmail = await getGoogleGmailConnectedEmail(userId!);
    const sentAt = new Date().toISOString();

    try {
      await saveContactEmail(supabase, {
        user_id: workspaceOwnerId!,
        contact_id: contactId,
        ticket_id: ticketId,
        mailbox_user_id: userId!,
        direction: "outbound",
        gmail_message_id: sent.messageId,
        gmail_thread_id: sent.threadId ?? null,
        from_email: fromEmail,
        to_email: to,
        subject,
        body: emailBody,
        sent_at: sentAt,
      });
    } catch (saveErr) {
      console.error("contact_emails save after ticket send:", saveErr);
    }

    await logEmailContactActivity(supabase, {
      userId: workspaceOwnerId!,
      createdBy: userId,
      contactId,
      direction: "outbound",
      subject,
      body: emailBody,
      to,
      from: fromEmail,
      gmail_message_id: sent.messageId,
      gmail_thread_id: sent.threadId ?? null,
    });

    await logTicketEmailNote(supabase, {
      workspaceOwnerId: workspaceOwnerId!,
      ticketId,
      direction: "outbound",
      subject,
      body: emailBody,
    });

    void triggerN8NWebhook("email.sent", {
      contact_id: contactId,
      ticket_id: ticketId,
      to,
      subject,
      gmail_message_id: sent.messageId,
      gmail_thread_id: sent.threadId,
    });

    void syncContactEmailsFromGmail(
      userId!,
      workspaceOwnerId!,
      contactId,
      to
    ).catch((syncErr) => {
      console.error("post-send ticket email sync:", syncErr);
    });

    return NextResponse.json({
      success: true,
      message_id: sent.messageId,
      thread_id: sent.threadId,
    });
  } catch (err) {
    console.error("POST /api/tickets/[id]/emails/send:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
