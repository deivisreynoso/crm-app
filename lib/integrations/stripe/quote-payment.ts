import { getStripeClient, isStripeConfigured } from "@/lib/integrations/stripe/client";

export type QuotePaymentIntentInput = {
  documentId: string;
  amountCents: number;
  currency: string;
  customerEmail?: string | null;
  metadata?: Record<string, string>;
};

export async function createQuotePaymentIntent(input: QuotePaymentIntentInput) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }

  const stripe = getStripeClient();
  return stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: input.currency.toLowerCase(),
    receipt_email: input.customerEmail ?? undefined,
    metadata: {
      document_id: input.documentId,
      ...input.metadata,
    },
    automatic_payment_methods: { enabled: true },
  });
}
