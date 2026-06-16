import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { isMailgunConfigured } from "@/lib/email/mailgun-config";
import { sendMailgunEmailWithAttachment } from "@/lib/email/mailgun";
import {
  generateInvoicePdfBuffer,
  storeInvoicePdf,
  type InvoiceLineItem,
} from "@/lib/finances/invoices";
import {
  getCustomerT,
  interpolateCustomerCopy,
} from "@/lib/i18n/customer-comms";

type InvoiceEmailContact = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  preferred_language?: string | null;
};

async function resolveInvoiceEmailContact(
  supabase: SupabaseClient,
  contactId?: string | null
): Promise<InvoiceEmailContact | null> {
  if (!contactId) return null;
  const { data } = await supabase
    .from("contacts")
    .select("first_name, last_name, email, preferred_language")
    .eq("id", contactId)
    .maybeSingle();
  return (data as InvoiceEmailContact | null) ?? null;
}

function customerName(contact: InvoiceEmailContact | null): string {
  const fullName = [contact?.first_name, contact?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || "there";
}

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
  locale?: string | null;
  customerName: string;
  currency: string;
}) {
  const t = getCustomerT(input.locale).paymentReceipt;
  const opening = interpolateCustomerCopy(t.bodyOpening, {
    name: input.customerName,
    amount: input.paymentAmount,
    currency: input.currency,
  });
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
      <p style="margin:0 0 12px;">${opening}</p>
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
      <p style="margin:16px 0 0;font-size:14px;">${interpolateCustomerCopy(t.invoiceRef, { invoice_number: input.invoiceNumber })}</p>
      <p style="font-size:13px;color:#666;margin:16px 0 0;">${t.thankYou}</p>
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
  locale?: string | null;
  customerName: string;
  currency: string;
}) {
  const t = getCustomerT(input.locale).paymentReceipt;
  const opening = interpolateCustomerCopy(t.bodyOpening, {
    name: input.customerName,
    amount: input.total,
    currency: input.currency,
  });
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
      <p style="margin:0 0 12px;">${opening}</p>
      <p style="margin:0 0 16px;">${interpolateCustomerCopy(t.invoiceRef, { invoice_number: input.invoiceNumber })}</p>
      <p style="margin:0 0 16px;">${t.thankYou}</p>
      <p style="margin:0;font-size:13px;color:#666;">A PDF receipt is attached to this email.</p>
      ${input.companyName ? `<p style="margin:16px 0 0;font-size:13px;color:#666;">${input.companyName}</p>` : ""}
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
  const contact = await resolveInvoiceEmailContact(
    supabase,
    (input.invoice as { contact_id?: string | null }).contact_id
  );
  const t = getCustomerT(contact?.preferred_language).paymentReceipt;
  const paymentAmount = formatter.format(input.paymentAmount);

  await sendEmail({
    to: input.toEmail,
    subject: interpolateCustomerCopy(t.subject, {
      invoice_number: input.invoice.invoice_number,
    }),
    html: partialPaymentHtml({
      invoiceNumber: input.invoice.invoice_number,
      paymentAmount,
      amountPaid: formatter.format(input.amountPaid),
      balanceDue: formatter.format(input.balanceDue),
      total: formatter.format(Number(input.invoice.total)),
      companyName: settings?.quote_company_name as string | undefined,
      locale: contact?.preferred_language,
      customerName: customerName(contact),
      currency: input.invoice.currency,
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
  const contact = await resolveInvoiceEmailContact(supabase, input.invoice.contact_id);
  const t = getCustomerT(contact?.preferred_language).paymentReceipt;

  const html = receiptHtml({
    invoiceNumber: input.invoice.invoice_number,
    total: formatter.format(Number(input.invoice.total)),
    companyName: settings?.quote_company_name as string | undefined,
    locale: contact?.preferred_language,
    customerName: customerName(contact),
    currency: input.invoice.currency,
  });

  await sendMailgunEmailWithAttachment({
    to: input.toEmail,
    subject: interpolateCustomerCopy(t.subject, {
      invoice_number: input.invoice.invoice_number,
    }),
    html,
    attachment: {
      filename: pdf.fileName,
      data: pdf.buffer,
      contentType: "application/pdf",
    },
  });

  return { sent: true };
}
