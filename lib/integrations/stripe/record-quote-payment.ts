import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSideClient } from "@/lib/supabase";
import { quotePaymentNotes } from "@/lib/quotes/quote-payment-notes";

export type RecordQuotePaymentInput = {
  documentId: string;
  amount: number;
  stripeId: string;
  status: string;
  stripeInvoiceId?: string | null;
  receiptUrl?: string | null;
};

export async function getLatestQuotePayment(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  documentId: string
) {
  const notes = quotePaymentNotes(documentId);
  const { data } = await supabase
    .from("payments")
    .select(
      "id, amount, currency, status, stripe_payment_id, stripe_invoice_id, receipt_url, created_at"
    )
    .eq("user_id", workspaceOwnerId)
    .eq("notes", notes)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function recordQuotePayment(input: RecordQuotePaymentInput) {
  const supabase = createServerSideClient();
  const notes = quotePaymentNotes(input.documentId);

  const { data: byStripeId } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_payment_id", input.stripeId)
    .maybeSingle();
  if (byStripeId) return;

  const { data: existingCompleted } = await supabase
    .from("payments")
    .select("id")
    .eq("notes", notes)
    .eq("status", "completed")
    .maybeSingle();
  if (existingCompleted) return;

  const { data: doc } = await supabase
    .from("documents")
    .select("user_id, contact_id")
    .eq("id", input.documentId)
    .maybeSingle();

  if (!doc?.user_id) return;

  await supabase.from("payments").insert([
    {
      user_id: doc.user_id,
      contact_id: doc.contact_id ?? null,
      amount: input.amount,
      status: input.status,
      stripe_payment_id: input.stripeId,
      stripe_invoice_id: input.stripeInvoiceId ?? null,
      receipt_url: input.receiptUrl ?? null,
      notes,
    },
  ]);

  await supabase
    .from("documents")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.documentId);
}
