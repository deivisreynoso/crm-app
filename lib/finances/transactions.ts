import type { SupabaseClient } from "@supabase/supabase-js";
import { recalculateInvoicePaymentStatus } from "@/lib/finances/invoice-payment-status";

export type FinanceCurrency = "USD" | "MXN";

export async function voidFinanceTransaction(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  transactionId: string,
  actorUserId: string,
  voidReason: string
) {
  const { data: original, error: fetchError } = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", workspaceOwnerId)
    .single();

  if (fetchError || !original) {
    throw new Error("Transaction not found");
  }
  if (original.status === "voided") {
    return original;
  }

  const now = new Date().toISOString();
  await supabase
    .from("finance_transactions")
    .update({
      status: "voided",
      voided_at: now,
      voided_by: actorUserId,
      void_reason: voidReason,
      updated_at: now,
    })
    .eq("id", transactionId);

  const reversalDirection = original.direction === "inbound" ? "outbound" : "inbound";
  await supabase.from("finance_transactions").insert({
    user_id: workspaceOwnerId,
    type: "adjustment",
    category_id: original.category_id,
    amount: original.amount,
    currency: original.currency,
    status: "completed",
    source: "manual",
    direction: reversalDirection,
    contact_id: original.contact_id,
    invoice_id: original.invoice_id,
    description: `Reversal: ${original.description ?? "voided transaction"}`,
    notes: voidReason,
    transaction_date: new Date().toISOString().slice(0, 10),
    recorded_by: actorUserId,
    reverses_transaction_id: transactionId,
  });

  if (original.invoice_id) {
    await recalculateInvoicePaymentStatus(
      supabase,
      workspaceOwnerId,
      original.invoice_id as string
    );
  }

  return original;
}

export async function recordStripeFinanceTransaction(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    invoiceId: string;
    paymentLinkId?: string | null;
    contactId?: string | null;
    amount: number;
    currency: FinanceCurrency;
    source: "stripe_checkout" | "stripe_payment_link";
    stripePaymentIntentId?: string | null;
    stripeCheckoutSessionId?: string | null;
    categoryId?: string | null;
    description?: string;
  }
) {
  if (!input.invoiceId) {
    throw new Error("invoice_id is required for income transactions");
  }

  if (input.stripePaymentIntentId) {
    const { data: existing } = await supabase
      .from("finance_transactions")
      .select("id, status")
      .eq("user_id", input.workspaceOwnerId)
      .eq("stripe_payment_intent_id", input.stripePaymentIntentId)
      .maybeSingle();
    if (existing?.status === "completed") return existing;
  }

  if (input.stripeCheckoutSessionId) {
    const { data: existing } = await supabase
      .from("finance_transactions")
      .select("id, status")
      .eq("user_id", input.workspaceOwnerId)
      .eq("stripe_checkout_session_id", input.stripeCheckoutSessionId)
      .maybeSingle();
    if (existing?.status === "completed") return existing;
  }

  const row = {
    user_id: input.workspaceOwnerId,
    type: "income" as const,
    category_id: input.categoryId,
    amount: input.amount,
    currency: input.currency,
    status: "completed" as const,
    source: input.source,
    direction: "inbound" as const,
    contact_id: input.contactId ?? null,
    invoice_id: input.invoiceId,
    payment_link_id: input.paymentLinkId ?? null,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
    description: input.description ?? "Stripe payment",
    transaction_date: new Date().toISOString().slice(0, 10),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("finance_transactions")
    .insert(row)
    .select()
    .single();
  if (insertError) throw insertError;

  await recalculateInvoicePaymentStatus(supabase, input.workspaceOwnerId, input.invoiceId, {
    lastPaymentAmount: input.amount,
  });
  return inserted;
}
