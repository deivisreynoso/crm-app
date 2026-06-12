import { getStripeClient, isStripeConfigured } from "@/lib/integrations/stripe/client";
import type { FinanceCurrency } from "@/lib/finances/transactions";

export async function createStripePaymentLink(input: {
  amountCents: number;
  currency: FinanceCurrency;
  title: string;
  metadata: Record<string, string>;
}) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }

  const stripe = getStripeClient();
  return stripe.paymentLinks.create({
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountCents,
          product_data: { name: input.title },
        },
      },
    ],
    metadata: input.metadata,
  });
}

export async function deactivateStripePaymentLink(stripePaymentLinkId: string) {
  if (!isStripeConfigured()) return;
  const stripe = getStripeClient();
  await stripe.paymentLinks.update(stripePaymentLinkId, { active: false });
}
