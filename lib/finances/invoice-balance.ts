import type { SupabaseClient } from "@supabase/supabase-js";

export async function getInvoiceAmountPaid(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string
): Promise<number> {
  const { data: txs } = await supabase
    .from("finance_transactions")
    .select("amount")
    .eq("user_id", workspaceOwnerId)
    .eq("invoice_id", invoiceId)
    .eq("type", "income")
    .eq("direction", "inbound")
    .eq("status", "completed");

  return (txs ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

export function computeBalanceDue(total: number, amountPaid: number): number {
  return Math.max(0, Math.round((total - amountPaid) * 100) / 100);
}

export function isFullyPaid(total: number, amountPaid: number): boolean {
  return total > 0 && amountPaid > 0 && amountPaid >= total;
}

export function isPartiallyPaid(total: number, amountPaid: number): boolean {
  return total > 0 && amountPaid > 0 && amountPaid < total;
}

export async function getInvoiceBalance(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string
): Promise<{ total: number; amountPaid: number; balanceDue: number }> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total")
    .eq("id", invoiceId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const total = Number(invoice.total ?? 0);
  const amountPaid = await getInvoiceAmountPaid(supabase, workspaceOwnerId, invoiceId);
  return { total, amountPaid, balanceDue: computeBalanceDue(total, amountPaid) };
}
