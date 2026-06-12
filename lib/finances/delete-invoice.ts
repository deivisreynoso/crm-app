import type { SupabaseClient } from "@supabase/supabase-js";
import { recalculateQuotePaymentStatus } from "@/lib/finances/quote-payment-status";
import { deleteDocumentStorage } from "@/lib/storage/cleanup-document";

export async function ownerDeleteInvoice(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  invoiceId: string
): Promise<void> {
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("id, quote_id, pdf_storage_path")
    .eq("id", invoiceId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const { error: purgeError } = await supabase.rpc("finance_owner_purge_invoice", {
    p_invoice_id: invoiceId,
    p_workspace_owner_id: workspaceOwnerId,
  });

  if (purgeError) {
    throw new Error(purgeError.message);
  }

  await deleteDocumentStorage(supabase, invoice.pdf_storage_path);

  if (invoice.quote_id) {
    await recalculateQuotePaymentStatus(supabase, workspaceOwnerId, invoice.quote_id);
  }
}
