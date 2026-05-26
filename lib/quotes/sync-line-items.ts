import type { SupabaseClient } from "@supabase/supabase-js";
import { computeQuoteTotals, lineTotal } from "@/lib/quotes/calculate-totals";

export type LineItemInput = {
  service_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order?: number;
};

export async function replaceQuoteLineItems(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
  lines: LineItemInput[],
  taxRate: number
): Promise<{ subtotal: number; tax_amount: number; total_amount: number }> {
  await supabase.from("quote_line_items").delete().eq("document_id", documentId);

  const rows = lines
    .filter((l) => l.description.trim())
    .map((l, i) => {
      const quantity = Number(l.quantity) || 0;
      const unit_price = Number(l.unit_price) || 0;
      return {
        document_id: documentId,
        user_id: userId,
        service_id: l.service_id.trim(),
        description: l.description.trim(),
        quantity,
        unit_price,
        line_total: lineTotal(quantity, unit_price),
        sort_order: l.sort_order ?? i,
      };
    });

  if (rows.length > 0) {
    const { error } = await supabase.from("quote_line_items").insert(rows);
    if (error) throw new Error(error.message);
  }

  const totals = computeQuoteTotals(
    rows.map((r) => ({ quantity: r.quantity, unit_price: r.unit_price })),
    taxRate
  );

  const { error: docErr } = await supabase
    .from("documents")
    .update({
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total_amount: totals.total_amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("user_id", userId);

  if (docErr) throw new Error(docErr.message);

  return totals;
}
