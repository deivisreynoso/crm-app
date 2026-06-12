import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyPaymentReceived } from "@/lib/finances/finance-notifications";
import {
  sendInvoiceReceiptEmail,
  sendPartialPaymentEmail,
} from "@/lib/finances/invoice-email";
import {
  computeBalanceDue,
  getInvoiceAmountPaid,
  isFullyPaid,
  isPartiallyPaid,
} from "@/lib/finances/invoice-balance";
import type { InvoiceLineItem } from "@/lib/finances/invoices";
import { recalculateQuotePaymentStatus } from "@/lib/finances/quote-payment-status";

const CLOSED_STATUSES = new Set(["voided", "paid"]);

export async function recalculateInvoicePaymentStatus(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string,
  options?: { lastPaymentAmount?: number }
): Promise<{ amount_paid: number; status: string; balance_due: number }> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, total, status, quote_id, invoice_number, currency, contact_id, line_items, subtotal, tax_rate, tax_amount, due_date, notes, footer_text, contact:contacts(email)"
    )
    .eq("id", invoiceId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "voided") {
    return { amount_paid: 0, status: "voided", balance_due: 0 };
  }

  const total = Number(invoice.total ?? 0);
  const amountPaid = await getInvoiceAmountPaid(supabase, workspaceOwnerId, invoiceId);
  const balanceDue = computeBalanceDue(total, amountPaid);
  const previousStatus = invoice.status as string;

  let nextStatus = previousStatus;
  if (isFullyPaid(total, amountPaid)) {
    nextStatus = "paid";
  } else if (isPartiallyPaid(total, amountPaid)) {
    nextStatus = "partially_paid";
  } else if (
    amountPaid <= 0 &&
    !["draft", "voided"].includes(previousStatus)
  ) {
    nextStatus = "pending";
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const becamePaid = nextStatus === "paid" && previousStatus !== "paid";

  if (nextStatus !== previousStatus) {
    patch.status = nextStatus;
  }

  if (becamePaid) {
    patch.paid_at = new Date().toISOString();
  } else if (nextStatus !== "paid" && previousStatus === "paid") {
    patch.paid_at = null;
  }

  if (Object.keys(patch).length > 1) {
    await supabase.from("invoices").update(patch).eq("id", invoiceId);
  }

  const contactEmail = (invoice.contact as { email?: string | null } | null)?.email?.trim();
  const invoicePayload = {
    id: invoice.id as string,
    invoice_number: invoice.invoice_number as string,
    total,
    currency: invoice.currency as string,
    contact_id: invoice.contact_id as string,
    line_items: (invoice.line_items ?? []) as InvoiceLineItem[],
    subtotal: Number(invoice.subtotal),
    tax_rate: Number(invoice.tax_rate),
    tax_amount: Number(invoice.tax_amount),
    due_date: invoice.due_date as string | null,
    notes: invoice.notes as string | null,
    footer_text: invoice.footer_text as string | null,
  };

  if (options?.lastPaymentAmount && options.lastPaymentAmount > 0) {
    try {
      await notifyPaymentReceived(
        supabase,
        workspaceOwnerId,
        invoiceId,
        invoice.invoice_number as string
      );
    } catch (err) {
      console.error("Finance payment notification failed:", err);
    }
  }

  if (contactEmail && options?.lastPaymentAmount && options.lastPaymentAmount > 0) {
    try {
      if (isFullyPaid(total, amountPaid)) {
        await sendInvoiceReceiptEmail(supabase, {
          workspaceOwnerId,
          invoice: invoicePayload,
          toEmail: contactEmail,
        });
      } else if (amountPaid > 0) {
        await sendPartialPaymentEmail(supabase, {
          workspaceOwnerId,
          invoice: invoicePayload,
          toEmail: contactEmail,
          paymentAmount: options.lastPaymentAmount,
          amountPaid,
          balanceDue,
        });
      }
    } catch (err) {
      console.error("Invoice payment email failed:", err);
    }
  }

  if (invoice.quote_id) {
    await recalculateQuotePaymentStatus(
      supabase,
      workspaceOwnerId,
      invoice.quote_id as string
    );
  }

  return { amount_paid: amountPaid, status: nextStatus, balance_due: balanceDue };
}
