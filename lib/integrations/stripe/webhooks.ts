import { getStripeClient } from "@/lib/integrations/stripe/client";

export function verifyStripeWebhookSignature(
  payload: string,
  signature: string | null
) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return null;

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
