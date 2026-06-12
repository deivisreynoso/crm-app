import type { SupabaseClient } from "@supabase/supabase-js";

export type QuotePaymentStatus = "unpaid" | "partially_paid" | "paid";

export async function recalculateQuotePaymentStatus(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  quoteId: string
): Promise<{ amount_paid: number; payment_status: QuotePaymentStatus }> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, total")
    .eq("user_id", workspaceOwnerId)
    .eq("quote_id", quoteId)
    .neq("status", "voided")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let amountPaid = 0;

  if (invoice?.id) {
    const { data: txs } = await supabase
      .from("finance_transactions")
      .select("amount")
      .eq("user_id", workspaceOwnerId)
      .eq("invoice_id", invoice.id)
      .eq("type", "income")
      .eq("direction", "inbound")
      .eq("status", "completed");

    amountPaid = (txs ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("total_amount")
    .eq("id", quoteId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  const total = Number(doc?.total_amount ?? invoice?.total ?? 0);
  let payment_status: QuotePaymentStatus = "unpaid";
  if (amountPaid > 0 && (total <= 0 || amountPaid >= total)) {
    payment_status = "paid";
  } else if (amountPaid > 0) {
    payment_status = "partially_paid";
  }

  await supabase
    .from("documents")
    .update({
      amount_paid: amountPaid,
      payment_status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
    .eq("user_id", workspaceOwnerId);

  return { amount_paid: amountPaid, payment_status };
}
