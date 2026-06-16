import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { documentSendViaGmailSchema } from "@/lib/validators";
import { formatValidationDetails } from "@/lib/validation-errors";
import {
  generateInvoicePdfBuffer,
  storeInvoicePdf,
  type InvoiceLineItem,
} from "@/lib/finances/invoices";
import {
  getGoogleGmailConnectedEmail,
  getGoogleGmailConnection,
  isGoogleGmailConfigured,
  sendGmailMessage,
} from "@/lib/google/gmail";
import { saveContactEmail } from "@/lib/emails/save-contact-email";
import { logEmailContactActivity } from "@/lib/activities/log-email-activity";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { resolveGmailSendOptions } from "@/lib/emails/build-gmail-send-options";
import { appendEmailSignature } from "@/lib/email/signature";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    if (!isGoogleGmailConfigured()) {
      return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 503 });
    }

    const connection = await getGoogleGmailConnection(userId!);
    if (!connection.connected) {
      return NextResponse.json(
        { error: "Connect Gmail in Settings → Integrations.", needs_gmail_connect: true },
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
    const { data: invoice } = await supabase
      .from("invoices")
      .select("*, contact:contacts(id, first_name, last_name, email)")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.status === "voided" || invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice cannot be sent in this status." }, { status: 400 });
    }

    const contact = invoice.contact as {
      id?: string;
      email?: string | null;
    } | null;

    const to = parsed.data.to?.trim().toLowerCase() ?? contact?.email?.trim().toLowerCase() ?? "";
    if (!to) {
      return NextResponse.json({ error: "Recipient email is required." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email_signature_html, display_name")
      .eq("id", userId!)
      .maybeSingle();

    let emailBody = parsed.data.body?.trim() || `Please find invoice ${invoice.invoice_number} attached.`;
    if (!parsed.data.skip_signature_append) {
      emailBody = appendEmailSignature(
        emailBody,
        profile?.email_signature_html as string | null | undefined
      );
    }

    const pdf = await generateInvoicePdfBuffer(
      supabase,
      {
        id: invoice.id as string,
        invoice_number: invoice.invoice_number as string,
        line_items: (invoice.line_items as InvoiceLineItem[]) ?? [],
        subtotal: Number(invoice.subtotal),
        tax_rate: Number(invoice.tax_rate),
        tax_amount: Number(invoice.tax_amount),
        total: Number(invoice.total),
        currency: invoice.currency as string,
        due_date: invoice.due_date as string | null,
        notes: invoice.notes as string | null,
        footer_text: invoice.footer_text as string | null,
        contact_id: invoice.contact_id as string,
      },
      workspaceOwnerId!
    );

    await storeInvoicePdf(supabase, workspaceOwnerId!, id, pdf);

    const sendOptions = await resolveGmailSendOptions(userId!, {
      cc: parsed.data.cc,
      bcc: parsed.data.bcc,
    });

    const sent = await sendGmailMessage(userId!, {
      to,
      subject: parsed.data.subject?.trim() || `Invoice ${invoice.invoice_number}`,
      body: emailBody,
      fromName: profile?.display_name as string | null | undefined,
      attachments: [
        {
          filename: pdf.fileName,
          mimeType: "application/pdf",
          content: pdf.buffer,
        },
      ],
      ...sendOptions,
    });

    if (!sent) {
      return NextResponse.json({ error: "Could not send via Gmail." }, { status: 502 });
    }

    const now = new Date().toISOString();
    await supabase
      .from("invoices")
      .update({ status: "sent", sent_at: now, updated_at: now })
      .eq("id", id);

    const fromEmail = await getGoogleGmailConnectedEmail(userId!);

    if (contact?.id) {
      try {
        await saveContactEmail(supabase, {
          user_id: workspaceOwnerId!,
          contact_id: contact.id,
          mailbox_user_id: userId!,
          direction: "outbound",
          gmail_message_id: sent.messageId,
          gmail_thread_id: sent.threadId ?? null,
          from_email: fromEmail,
          to_email: to,
          subject: parsed.data.subject?.trim() || `Invoice ${invoice.invoice_number}`,
          body: emailBody,
          sent_at: now,
        });
        await logEmailContactActivity(supabase, {
          userId: workspaceOwnerId!,
          createdBy: userId!,
          contactId: contact.id,
          direction: "outbound",
          subject: parsed.data.subject?.trim() || `Invoice ${invoice.invoice_number}`,
          body: emailBody,
          to,
          from: fromEmail,
          gmail_message_id: sent.messageId,
          gmail_thread_id: sent.threadId ?? null,
        });
        await logContactActivity(supabase, {
          userId: workspaceOwnerId!,
          createdBy: userId!,
          contactId: contact.id,
          type: "system",
          description: `Invoice ${invoice.invoice_number} sent to ${to}`,
          metadata: { invoice_id: id, to },
        });
      } catch (err) {
        console.error("Invoice email logging failed:", err);
      }
    }

    return NextResponse.json({ success: true, message_id: sent.messageId });
  } catch (err) {
    console.error("POST invoice send-via-gmail:", err);
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
