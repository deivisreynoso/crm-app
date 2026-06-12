import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceLineItem } from "@/lib/finances/invoices";

/**
 * Sprint 2 quote checkout regression: resolve invoice for legacy checkout metadata
 * that has document_id but no invoice_id.
 */
export async function ensureInvoiceForQuoteCheckout(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  quoteId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("user_id", workspaceOwnerId)
    .eq("quote_id", quoteId)
    .neq("status", "voided")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const { data: quote } = await supabase
    .from("documents")
    .select(
      "id, contact_id, status, accepted_at, line_items, subtotal, tax_rate, tax_amount, total_amount, currency"
    )
    .eq("id", quoteId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!quote?.contact_id) {
    return null;
  }

  const isAccepted =
    quote.status === "accepted" ||
    quote.status === "signed" ||
    !!quote.accepted_at;

  if (!isAccepted) {
    return null;
  }

  const lineItemsRaw = Array.isArray(quote.line_items) ? quote.line_items : [];
  const lineItems: InvoiceLineItem[] =
    lineItemsRaw.length > 0
      ? lineItemsRaw.map((line: Record<string, unknown>) => ({
          description: String(line.description ?? "Service"),
          quantity: Number(line.quantity) || 1,
          unit_price: Number(line.unit_price) || 0,
          line_total: Number(line.line_total) || 0,
        }))
      : [
          {
            description: "Quote services",
            quantity: 1,
            unit_price: Number(quote.total_amount) || 0,
            line_total: Number(quote.total_amount) || 0,
          },
        ];

  const subtotal = Number(quote.subtotal ?? quote.total_amount ?? 0);
  const taxRate = Number(quote.tax_rate ?? 0);
  const taxAmount = Number(quote.tax_amount ?? 0);
  const total = Number(quote.total_amount ?? subtotal + taxAmount);
  const currency = quote.currency === "MXN" ? "MXN" : "USD";

  const { data: settings } = await supabase
    .from("user_settings")
    .select("invoice_default_due_days, invoice_default_footer_text")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  let dueDate: string | null = null;
  if (settings?.invoice_default_due_days) {
    const d = new Date();
    d.setDate(d.getDate() + Number(settings.invoice_default_due_days));
    dueDate = d.toISOString().slice(0, 10);
  }

  const { data: created, error } = await supabase
    .from("invoices")
    .insert({
      user_id: workspaceOwnerId,
      quote_id: quoteId,
      contact_id: quote.contact_id,
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: 0,
      total,
      currency,
      due_date: dueDate,
      footer_text: settings?.invoice_default_footer_text ?? null,
      invoice_number: "",
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("ensureInvoiceForQuoteCheckout:", error?.message);
    return null;
  }

  return created.id as string;
}
