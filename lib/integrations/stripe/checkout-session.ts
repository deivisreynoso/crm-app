import { getStripeClient, isStripeConfigured } from "@/lib/integrations/stripe/client";
import { resolvePublicAppOrigin } from "@/lib/auth/app-url";

export type QuoteCheckoutInput = {
  documentId: string;
  token: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  quoteTitle: string;
  quoteReference?: string | null;
};

export async function createQuoteCheckoutSession(input: QuoteCheckoutInput) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }

  const stripe = getStripeClient();
  const base = resolvePublicAppOrigin();
  const successUrl = `${base}/quote/${encodeURIComponent(input.token)}?payment=success`;
  const cancelUrl = `${base}/quote/${encodeURIComponent(input.token)}?payment=cancelled`;

  const name = input.quoteReference
    ? `Quote ${input.quoteReference} — ${input.quoteTitle}`
    : input.quoteTitle;

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountCents,
          product_data: { name },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      document_id: input.documentId,
      quote_token: input.token,
    },
    invoice_creation: { enabled: true },
  });
}
