import { verifyStripeWebhookSignature } from "@/lib/integrations/stripe/webhooks";
import { recordQuotePayment } from "@/lib/integrations/stripe/record-quote-payment";
import Stripe from "stripe";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = verifyStripeWebhookSignature(payload, signature);
  } catch (err) {
    console.error("Stripe webhook signature failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!event) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const documentId = intent.metadata?.document_id;
    if (documentId) {
      await recordQuotePayment({
        documentId,
        amount: intent.amount ? intent.amount / 100 : 0,
        stripeId: intent.id,
        status: "completed",
      });
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const documentId = session.metadata?.document_id;
    if (documentId && session.payment_status === "paid") {
      await recordQuotePayment({
        documentId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        stripeId: session.payment_intent
          ? String(session.payment_intent)
          : session.id,
        status: "completed",
        stripeInvoiceId: session.invoice ? String(session.invoice) : null,
      });
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const documentId = invoice.metadata?.document_id;
    if (documentId) {
      await recordQuotePayment({
        documentId,
        amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
        stripeId: invoice.id,
        status: "completed",
        stripeInvoiceId: invoice.id,
        receiptUrl: invoice.hosted_invoice_url ?? null,
      });
    }
  }

  return Response.json({ received: true });
}
