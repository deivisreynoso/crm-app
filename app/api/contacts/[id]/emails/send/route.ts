import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { gmailSendSchema } from "@/lib/validators";
import { formatValidationDetails } from "@/lib/validation-errors";
import { getGoogleGmailConnectedEmail, sendGmailMessage } from "@/lib/google/gmail";
import { saveContactEmail } from "@/lib/emails/save-contact-email";
import { logEmailContactActivity } from "@/lib/activities/log-email-activity";
import { triggerN8NWebhook } from "@/lib/n8n";
import {
  buildTemplateContext,
  interpolateTemplate,
} from "@/lib/documents/template-variables";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id: contactId } = await context.params;
    const body = await req.json();
    const parsed = gmailSendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationDetails(parsed.error) },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, company, company_id")
      .eq("id", contactId)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (contactError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

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

      let companyName: string | undefined;
      if (contact.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", contact.company_id)
          .eq("user_id", workspaceOwnerId!)
          .maybeSingle();
        companyName = company?.name;
      }

      const ctx = buildTemplateContext({
        contact,
        company: companyName ? { name: companyName } : null,
      });

      if (!subject) subject = interpolateTemplate(template.subject, ctx);
      if (!emailBody) emailBody = interpolateTemplate(template.body, ctx);
    }

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "Subject and message body are required" },
        { status: 400 }
      );
    }

    const sent = await sendGmailMessage(workspaceOwnerId!, { to, subject, body: emailBody });

    if (!sent) {
      return NextResponse.json(
        {
          error:
            "Could not send email. Connect Gmail in Settings and ensure the Gmail API is enabled in Google Cloud.",
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
      console.error("contact_emails save after send:", saveErr);
    }

    await logEmailContactActivity(supabase, {
      userId: workspaceOwnerId!,
      contactId,
      direction: "outbound",
      subject,
      body: emailBody,
      to,
      from: fromEmail,
      gmail_message_id: sent.messageId,
      gmail_thread_id: sent.threadId ?? null,
    });

    void triggerN8NWebhook("email.sent", {
      contact_id: contactId,
      to,
      subject,
      gmail_message_id: sent.messageId,
      gmail_thread_id: sent.threadId,
    });

    return NextResponse.json({
      success: true,
      message_id: sent.messageId,
      thread_id: sent.threadId,
    });
  } catch (err) {
    console.error("POST /api/contacts/[id]/emails/send:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
