import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripePaymentLink } from "@/lib/integrations/stripe/payment-link";
import { isStripeConfigured } from "@/lib/integrations/stripe/client";
import {
  assertNoActiveInvoiceForQuote,
  assertQuoteAcceptedForInvoice,
  type InvoiceLineItem,
} from "@/lib/finances/invoices";
import { sendInvoicePaymentRequestEmail } from "@/lib/finances/invoice-email";
import type { InvoiceCollectionMethod, InvoiceTypeId } from "@/lib/finances/invoice-types";
import type { FinanceCurrency } from "@/lib/finances/transactions";
import { logContactActivity } from "@/lib/activities/log-contact-activity";

export type InvoiceWizardInput = {
  invoice_type: InvoiceTypeId;
  quote_id?: string | null;
  contact_id: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount?: number;
  total: number;
  currency: FinanceCurrency;
  due_date?: string | null;
  notes?: string | null;
  footer_text?: string | null;
  collection_method: InvoiceCollectionMethod;
};

export async function executeInvoiceWizard(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  userId: string,
  body: InvoiceWizardInput
) {
  if (body.invoice_type === "quote") {
    if (!body.quote_id) {
      throw new Error("Quote is required for quote invoices.");
    }
    const accepted = await assertQuoteAcceptedForInvoice(
      supabase,
      workspaceOwnerId,
      body.quote_id
    );
    if (!accepted.ok) throw new Error(accepted.reason);

    const unique = await assertNoActiveInvoiceForQuote(
      supabase,
      workspaceOwnerId,
      body.quote_id
    );
    if (!unique.ok) throw new Error(unique.reason);
  } else if (body.quote_id) {
    throw new Error("Only quote invoices can include a quote reference.");
  }

  if (body.collection_method === "payment_link" && !isStripeConfigured()) {
    throw new Error("Stripe is not configured for payment links.");
  }

  if (body.total <= 0) {
    throw new Error("Invoice total must be greater than zero.");
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("invoice_default_due_days, invoice_default_footer_text, finance_default_tax_rate")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  let dueDate = body.due_date;
  if (!dueDate && settings?.invoice_default_due_days) {
    const d = new Date();
    d.setDate(d.getDate() + Number(settings.invoice_default_due_days));
    dueDate = d.toISOString().slice(0, 10);
  }

  const { data: invoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      user_id: workspaceOwnerId,
      quote_id: body.invoice_type === "quote" ? body.quote_id : null,
      contact_id: body.contact_id,
      invoice_type: body.invoice_type,
      collection_method: body.collection_method,
      line_items: body.line_items,
      subtotal: body.subtotal,
      tax_rate: body.tax_rate ?? settings?.finance_default_tax_rate ?? 0,
      tax_amount: body.tax_amount,
      discount_amount: body.discount_amount ?? 0,
      total: body.total,
      currency: body.currency,
      due_date: dueDate ?? null,
      notes: body.notes ?? null,
      footer_text: body.footer_text ?? settings?.invoice_default_footer_text ?? null,
      invoice_number: "",
      status: "pending",
    })
    .select(
      `
      *,
      contact:contacts(id, first_name, last_name, email),
      quote:documents(id, title, quote_reference)
    `
    )
    .single();

  if (insertError || !invoice) {
    throw new Error(insertError?.message ?? "Could not create invoice.");
  }

  let paymentLinkUrl: string | null = null;
  let emailSent = false;
  let emailError: string | undefined;

  if (body.collection_method === "payment_link") {
    const contactId = body.contact_id;
    const title = `Invoice ${invoice.invoice_number}`;

    const { data: linkRow, error: linkError } = await supabase
      .from("payment_links")
      .insert({
        user_id: workspaceOwnerId,
        invoice_id: invoice.id,
        contact_id: contactId,
        amount: body.total,
        currency: body.currency,
        url: "pending",
        status: "active",
        created_by: userId,
      })
      .select()
      .single();

    if (linkError || !linkRow) {
      throw new Error(linkError?.message ?? "Could not create payment link.");
    }

    const stripeLink = await createStripePaymentLink({
      amountCents: Math.round(body.total * 100),
      currency: body.currency,
      title,
      metadata: {
        workspace_user_id: workspaceOwnerId,
        payment_link_id: linkRow.id as string,
        invoice_id: invoice.id as string,
      },
    });

    paymentLinkUrl = stripeLink.url;

    await supabase
      .from("payment_links")
      .update({
        stripe_payment_link_id: stripeLink.id,
        url: stripeLink.url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", linkRow.id);

    await supabase
      .from("invoices")
      .update({
        payment_link_id: linkRow.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    const toEmail = (invoice.contact as { email?: string | null } | null)?.email?.trim();
    if (toEmail) {
      const result = await sendInvoicePaymentRequestEmail(supabase, {
        workspaceOwnerId,
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total: Number(invoice.total),
          currency: invoice.currency,
          due_date: invoice.due_date,
          contact_id: invoice.contact_id,
          line_items: invoice.line_items as InvoiceLineItem[],
          subtotal: Number(invoice.subtotal),
          tax_rate: Number(invoice.tax_rate),
          tax_amount: Number(invoice.tax_amount),
          notes: invoice.notes,
          footer_text: invoice.footer_text,
        },
        paymentUrl: stripeLink.url,
        toEmail,
      });
      emailSent = result.sent;
      emailError = result.reason;
      if (emailSent) {
        await logContactActivity(supabase, {
          userId: workspaceOwnerId,
          createdBy: userId,
          contactId,
          type: "system",
          description: `Invoice ${invoice.invoice_number} sent to ${toEmail}`,
          metadata: { invoice_id: invoice.id, to: toEmail },
        });
      }
    } else {
      emailError = "Contact has no email address.";
    }
  }

  return {
    invoice,
    payment_link_url: paymentLinkUrl,
    email_sent: emailSent,
    email_error: emailError,
  };
}
