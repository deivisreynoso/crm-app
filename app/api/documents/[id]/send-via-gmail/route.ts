import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { documentSendViaGmailSchema } from "@/lib/validators";
import { formatValidationDetails } from "@/lib/validation-errors";
import { isQuoteDocument } from "@/lib/documents/kinds";
import { generateDocumentPdfBuffer } from "@/lib/documents/generate-document-pdf-buffer";
import {
  getGoogleGmailConnectedEmail,
  getGoogleGmailConnection,
  isGoogleGmailConfigured,
  sendGmailMessage,
} from "@/lib/google/gmail";
import { saveContactEmail } from "@/lib/emails/save-contact-email";
import { logEmailContactActivity } from "@/lib/activities/log-email-activity";
import { uploadToDocumentsBucket } from "@/lib/storage/documents";
import { syncContactEmailsFromGmail } from "@/lib/google/gmail-sync";
import { triggerN8NWebhook } from "@/lib/n8n";
import { getQuoteEmailDefaults } from "@/lib/crm/quote-pdf-labels";
import { ensureAcceptLinkInEmailBody } from "@/lib/quotes/quote-email-body";
import { ensureAcceptToken, quoteAcceptPublicUrl } from "@/lib/quotes/accept-token";
import { ensureQuoteReference } from "@/lib/quotes/reference";
import { resolveGmailSendOptions } from "@/lib/emails/build-gmail-send-options";
import {
  buildTemplateContext,
  interpolateTemplate,
} from "@/lib/documents/template-variables";
import { appendEmailSignature } from "@/lib/email/signature";
import {
  buildQuoteEmailMergeContext,
  mergeQuoteEmailContext,
  quoteEmailHasSignatureBlock,
} from "@/lib/email/quote-email-merge";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Send a quote/document via the signed-in user's connected Gmail / Workspace mailbox.
 * Generates a PDF attachment and logs the message on the linked contact when present.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    if (!isGoogleGmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then open Settings → Google Workspace setup.",
        },
        { status: 503 }
      );
    }

    const connection = await getGoogleGmailConnection(userId!);
    if (!connection.connected) {
      return NextResponse.json(
        {
          error:
            "Connect your Google Workspace or Gmail account in Settings → Integrations before sending.",
          needs_gmail_connect: true,
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const parsed = documentSendViaGmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: formatValidationDetails(parsed.error) },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!isQuoteDocument(doc.type as string)) {
      return NextResponse.json(
        { error: "Only quotes can be sent via Gmail from this action." },
        { status: 400 }
      );
    }

    let to = parsed.data.to?.trim().toLowerCase() ?? "";
    if (!to && doc.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("email, first_name, last_name, phone, company, company_id")
        .eq("id", doc.contact_id)
        .maybeSingle();
      to = contact?.email?.trim().toLowerCase() ?? "";
    }

    if (!to) {
      return NextResponse.json(
        { error: "Recipient email is required. Link a contact with an email or pass to in the request." },
        { status: 400 }
      );
    }

    let contactRow: {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      company_id?: string | null;
      preferred_language?: string | null;
    } | null = null;

    if (doc.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select(
          "email, first_name, last_name, phone, company, company_id, preferred_language"
        )
        .eq("id", doc.contact_id)
        .maybeSingle();
      contactRow = contact;
    }

    let contactLocale: string | null = contactRow?.preferred_language ?? null;

    const { data: settings } = await supabase
      .from("user_settings")
      .select("ui_locale")
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();
    const uiLocale = contactLocale ?? (settings?.ui_locale as string | null) ?? null;

    const quoteRef =
      (doc.quote_reference as string | null)?.trim() ||
      (await ensureQuoteReference(supabase, {
        id: doc.id,
        user_id: workspaceOwnerId!,
        type: doc.type as string,
        quote_reference: doc.quote_reference as string | null,
      }));

    const acceptToken = await ensureAcceptToken(supabase, {
      id: doc.id,
      type: doc.type as string,
      accept_token: doc.accept_token as string | null,
    });
    const acceptUrl = acceptToken ? quoteAcceptPublicUrl(acceptToken) : null;
    const emailDefaults = getQuoteEmailDefaults(uiLocale);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email_signature_html, display_name")
      .eq("id", userId!)
      .maybeSingle();

    let companyName: string | undefined;
    if (contactRow?.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", contactRow.company_id)
        .eq("user_id", workspaceOwnerId!)
        .maybeSingle();
      companyName = company?.name;
    }

    const mergeCtx = mergeQuoteEmailContext(
      contactRow
        ? (buildTemplateContext({
            contact: {
              first_name: contactRow.first_name ?? undefined,
              last_name: contactRow.last_name ?? undefined,
              email: contactRow.email ?? undefined,
              phone: contactRow.phone ?? undefined,
              company: contactRow.company ?? undefined,
            },
            company: companyName ? { name: companyName } : null,
            document: {
              title: doc.title as string,
              valid_until: (doc.valid_until as string | null) ?? undefined,
              quote_accept_url: acceptUrl ?? undefined,
            },
          }) as Record<string, string | undefined>)
        : {},
      buildQuoteEmailMergeContext({
        contact: contactRow,
        companyName,
        acceptUrl,
        userDisplayName: profile?.display_name as string | null | undefined,
        userSignatureHtml: profile?.email_signature_html as string | null | undefined,
      })
    );

    let subject =
      parsed.data.subject?.trim() ||
      `${emailDefaults.subjectPrefix} ${quoteRef ?? (doc.title as string)}`;
    let emailBody = parsed.data.body?.trim() || emailDefaults.bodyHtml;

    if (parsed.data.template_id && doc.contact_id && contactRow) {
      const { data: template } = await supabase
        .from("email_templates")
        .select("subject, body")
        .eq("id", parsed.data.template_id)
        .eq("user_id", workspaceOwnerId!)
        .maybeSingle();

      if (!template) {
        return NextResponse.json({ error: "Email template not found" }, { status: 404 });
      }

      if (!parsed.data.subject?.trim()) {
        subject = interpolateTemplate(template.subject, mergeCtx);
      }
      if (!parsed.data.body?.trim()) {
        emailBody = interpolateTemplate(template.body, mergeCtx);
      }
    }

    if (subject.includes("{{")) {
      subject = interpolateTemplate(subject, mergeCtx);
    }
    if (emailBody.includes("{{")) {
      emailBody = interpolateTemplate(emailBody, mergeCtx);
    }

    const signatureHtml = profile?.email_signature_html as string | null | undefined;
    const skipSignatureAppend =
      parsed.data.skip_signature_append ||
      quoteEmailHasSignatureBlock(emailBody, signatureHtml);

    if (!skipSignatureAppend) {
      emailBody = appendEmailSignature(emailBody, signatureHtml);
    }

    emailBody = ensureAcceptLinkInEmailBody(emailBody, acceptUrl, uiLocale);

    const { buffer, fileName } = await generateDocumentPdfBuffer(
      supabase,
      {
        id: doc.id,
        type: doc.type as string,
        title: doc.title as string,
        quote_reference: quoteRef,
        content: doc.content,
        contact_id: doc.contact_id,
        company_id: doc.company_id,
        opportunity_id: doc.opportunity_id,
        valid_until: doc.valid_until,
        header_html: doc.header_html,
        footer_html: doc.footer_html,
        subtotal: doc.subtotal,
        tax_rate: doc.tax_rate,
        tax_amount: doc.tax_amount,
        total_amount: doc.total_amount,
      },
      workspaceOwnerId!
    );

    const pdfFile = new File([new Uint8Array(buffer)], fileName, {
      type: "application/pdf",
    });
    const uploaded = await uploadToDocumentsBucket(
      supabase,
      workspaceOwnerId!,
      `${id}-pdf`,
      pdfFile
    );

    const extraAttachments: import("@/lib/google/gmail-attachments").GmailAttachment[] =
      (parsed.data.attachments ?? []).map((a) => ({
        filename: a.filename,
        mimeType: a.mime_type,
        content: Buffer.from(a.content_base64, "base64"),
      }));

    const sendOptions = await resolveGmailSendOptions(userId!, {
      cc: parsed.data.cc,
      bcc: parsed.data.bcc,
    });

    const sent = await sendGmailMessage(userId!, {
      to,
      subject,
      body: emailBody,
      fromName: profile?.display_name as string | null | undefined,
      attachments: [
        {
          filename: fileName,
          mimeType: "application/pdf",
          content: buffer,
        },
        ...extraAttachments,
      ],
      ...sendOptions,
    });

    if (!sent) {
      return NextResponse.json(
        {
          error:
            "Could not send via Gmail. Reconnect in Settings and ensure Gmail API is enabled.",
        },
        { status: 502 }
      );
    }

    const fromEmail = await getGoogleGmailConnectedEmail(userId!);
    const sentAt = new Date().toISOString();

    await supabase
      .from("documents")
      .update({
        status: "sent",
        sent_at: (doc.sent_at as string | null) ?? sentAt,
        accept_token: acceptToken,
        storage_path: uploaded.storagePath,
        file_url: uploaded.fileUrl,
        file_name: fileName,
        mime_type: "application/pdf",
        file_size_bytes: buffer.length,
        updated_at: sentAt,
      })
      .eq("id", id);

    if (doc.contact_id) {
      try {
        await saveContactEmail(supabase, {
          user_id: workspaceOwnerId!,
          contact_id: doc.contact_id as string,
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
        console.error("contact_emails save after quote send:", saveErr);
      }

      await logEmailContactActivity(supabase, {
        userId: workspaceOwnerId!,
        createdBy: userId,
        contactId: doc.contact_id as string,
        direction: "outbound",
        subject,
        body: emailBody,
        to,
        from: fromEmail,
        gmail_message_id: sent.messageId,
        gmail_thread_id: sent.threadId ?? null,
      });
    }

    void triggerN8NWebhook("document.sent", {
      ...doc,
      status: "sent",
      channel: "gmail",
      gmail_message_id: sent.messageId,
    });

    if (doc.contact_id) {
      void syncContactEmailsFromGmail(
        userId!,
        workspaceOwnerId!,
        doc.contact_id as string,
        to
      ).catch((syncErr) => {
        console.error("post-send quote email sync:", syncErr);
      });
    }

    return NextResponse.json({
      success: true,
      status: "sent",
      message_id: sent.messageId,
      thread_id: sent.threadId,
      from_email: fromEmail,
      to,
      pdf_file_name: fileName,
      pdf_file_url: uploaded.fileUrl,
    });
  } catch (err) {
    console.error("POST /api/documents/[id]/send-via-gmail:", err);
    const message = err instanceof Error ? err.message : "Failed to send quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
