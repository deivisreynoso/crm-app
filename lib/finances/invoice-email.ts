import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { isMailgunConfigured } from "@/lib/email/mailgun-config";
import { sendMailgunEmailWithAttachment } from "@/lib/email/mailgun";
import {
  generateInvoicePdfBuffer,
  storeInvoicePdf,
  type InvoiceLineItem,
} from "@/lib/finances/invoices";

function paymentRequestHtml(input: {
  invoiceNumber: string;
  total: string;
  dueDate?: string | null;
  paymentUrl: string;
  companyName?: string;
}) {
  const due = input.dueDate
    ? `<p style="color:#555;margin:0 0 16px;">Due: <strong>${input.dueDate}</strong></p>`
    : "";
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
      <p style="margin:0 0 12px;">Hello,</p>
      <p style="margin:0 0 16px;">
        ${input.companyName ? `<strong>${input.companyName}</strong> has` : "You have"} sent you
        invoice <strong>${input.invoiceNumber}</strong> for <strong>${input.total}</strong>.
      </p>
      ${due}
      <p style="margin:24px 0;">
        <a href="${input.paymentUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
          Pay now
        </a>
      </p>
      <p style="font-size:13px;color:#666;margin:24px 0 0;">
        If the button does not work, copy this link:<br/>
        <a href="${input.paymentUrl}">${input.paymentUrl}</a>
      </p>
    </div>
  `;
}

function partialPaymentHtml(input: {
  invoiceNumber: string;
  paymentAmount: string;
  amountPaid: string;
  balanceDue: string;
  total: string;
  companyName?: string;
}) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
      <p style="margin:0 0 12px;">Thank you — we received your payment.</p>
      <p style="margin:0 0 16px;">
        Payment of <strong>${input.paymentAmount}</strong> was applied to invoice
        <strong>${input.invoiceNumber}</strong>.
      </p>
      <p style="margin:0 0 8px;font-size:14px;">
        Paid so far: <strong>${input.amountPaid}</strong> of <strong>${input.total}</strong>
      </p>
      <p style="margin:0;font-size:14px;color:#555;">
        Remaining balance: <strong>${input.balanceDue}</strong>
      </p>
      <p style="font-size:13px;color:#666;margin:24px 0 0;">
        This invoice stays open until the full balance is received.
        ${input.companyName ? ` — ${input.companyName}` : ""}
      </p>
    </div>
  `;
}

function receiptHtml(input: {
  invoiceNumber: string;
  total: string;
  companyName?: string;
}) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
      <p style="margin:0 0 12px;">Thank you for your payment.</p>
      <p style="margin:0 0 16px;">
        Your payment for invoice <strong>${input.invoiceNumber}</strong>
        (${input.total}) has been received${input.companyName ? ` by <strong>${input.companyName}</strong>` : ""}.
      </p>
      <p style="margin:0;font-size:13px;color:#666;">A PDF receipt is attached to this email.</p>
    </div>
  `;
}

export async function sendInvoicePaymentRequestEmail(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    invoice: {
      id: string;
      invoice_number: string;
      total: number;
      currency: string;
      due_date?: string | null;
      contact_id: string;
      line_items: InvoiceLineItem[];
      subtotal: number;
      tax_rate: number;
      tax_amount: number;
      notes?: string | null;
      footer_text?: string | null;
    };
    paymentUrl: string;
    toEmail: string;
  }
): Promise<{ sent: boolean; reason?: string }> {
  if (!isMailgunConfigured()) {
    return { sent: false, reason: "Mailgun is not configured." };
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("quote_company_name")
    .eq("user_id", input.workspaceOwnerId)
    .maybeSingle();

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: input.invoice.currency,
  });

  await sendEmail({
    to: input.toEmail,
    subject: `Invoice ${input.invoice.invoice_number} — Pay now`,
    html: paymentRequestHtml({
      invoiceNumber: input.invoice.invoice_number,
      total: formatter.format(Number(input.invoice.total)),
      dueDate: input.invoice.due_date,
      paymentUrl: input.paymentUrl,
      companyName: settings?.quote_company_name as string | undefined,
    }),
  });

  return { sent: true };
}

export async function sendPartialPaymentEmail(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    invoice: {
      invoice_number: string;
      total: number;
      currency: string;
    };
    toEmail: string;
    paymentAmount: number;
    amountPaid: number;
    balanceDue: number;
  }
): Promise<{ sent: boolean; reason?: string }> {
  if (!isMailgunConfigured()) {
    return { sent: false, reason: "Mailgun is not configured." };
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("quote_company_name")
    .eq("user_id", input.workspaceOwnerId)
    .maybeSingle();

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: input.invoice.currency,
  });

  await sendEmail({
    to: input.toEmail,
    subject: `Payment received — Invoice ${input.invoice.invoice_number}`,
    html: partialPaymentHtml({
      invoiceNumber: input.invoice.invoice_number,
      paymentAmount: formatter.format(input.paymentAmount),
      amountPaid: formatter.format(input.amountPaid),
      balanceDue: formatter.format(input.balanceDue),
      total: formatter.format(Number(input.invoice.total)),
      companyName: settings?.quote_company_name as string | undefined,
    }),
  });

  return { sent: true };
}

export async function sendInvoiceReceiptEmail(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    invoice: {
      id: string;
      invoice_number: string;
      total: number;
      currency: string;
      contact_id: string;
      line_items: InvoiceLineItem[];
      subtotal: number;
      tax_rate: number;
      tax_amount: number;
      due_date?: string | null;
      notes?: string | null;
      footer_text?: string | null;
    };
    toEmail: string;
  }
): Promise<{ sent: boolean; reason?: string }> {
  if (!isMailgunConfigured()) {
    return { sent: false, reason: "Mailgun is not configured." };
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("quote_company_name")
    .eq("user_id", input.workspaceOwnerId)
    .maybeSingle();

  const pdf = await generateInvoicePdfBuffer(
    supabase,
    input.invoice,
    input.workspaceOwnerId
  );
  await storeInvoicePdf(supabase, input.workspaceOwnerId, input.invoice.id, pdf);

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: input.invoice.currency,
  });

  const html = receiptHtml({
    invoiceNumber: input.invoice.invoice_number,
    total: formatter.format(Number(input.invoice.total)),
    companyName: settings?.quote_company_name as string | undefined,
  });

  await sendMailgunEmailWithAttachment({
    to: input.toEmail,
    subject: `Receipt — Invoice ${input.invoice.invoice_number}`,
    html,
    attachment: {
      filename: pdf.fileName,
      data: pdf.buffer,
      contentType: "application/pdf",
    },
  });

  return { sent: true };
}
