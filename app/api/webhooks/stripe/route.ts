import { verifyStripeWebhookSignature } from "@/lib/integrations/stripe/webhooks";
import { createServerSideClient } from "@/lib/supabase";
import { getCategoryBySlug } from "@/lib/finances/categories";
import { ensureInvoiceForQuoteCheckout } from "@/lib/finances/ensure-invoice-for-quote";
import { recalculateInvoicePaymentStatus } from "@/lib/finances/invoice-payment-status";
import { recordStripeFinanceTransaction } from "@/lib/finances/transactions";
import type { FinanceCurrency } from "@/lib/finances/transactions";
import Stripe from "stripe";

function normalizeCurrency(value: string | null | undefined): FinanceCurrency {
  const c = value?.toUpperCase();
  return c === "MXN" ? "MXN" : "USD";
}

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    const verified = verifyStripeWebhookSignature(payload, signature);
    if (!verified) {
      return Response.json({ error: "Stripe not configured" }, { status: 503 });
    }
    event = verified;
  } catch (err) {
    console.error("Stripe webhook signature failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerSideClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return Response.json({ received: true });
    }

    const documentId = session.metadata?.document_id ?? null;
    const paymentLinkId = session.metadata?.payment_link_id ?? null;
    let invoiceId = session.metadata?.invoice_id ?? null;
    const workspaceUserId = session.metadata?.workspace_user_id ?? null;

    let workspaceOwnerId = workspaceUserId;
    let contactId: string | null = null;

    if (paymentLinkId) {
      const { data: link } = await supabase
        .from("payment_links")
        .select("*, invoice:invoices(id, contact_id)")
        .eq("id", paymentLinkId)
        .maybeSingle();
      if (link) {
        workspaceOwnerId = link.user_id as string;
        contactId = (link.contact_id as string | null) ?? null;
        invoiceId = invoiceId ?? (link.invoice_id as string);
        const inv = link.invoice as { contact_id?: string | null } | null;
        contactId = contactId ?? inv?.contact_id ?? null;

        await supabase
          .from("payment_links")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentLinkId);
      }
    } else if (documentId) {
      const { data: doc } = await supabase
        .from("documents")
        .select("user_id, contact_id")
        .eq("id", documentId)
        .maybeSingle();
      workspaceOwnerId = doc?.user_id as string;
      contactId = (doc?.contact_id as string | null) ?? null;

      if (!invoiceId && workspaceOwnerId && documentId) {
        invoiceId = await ensureInvoiceForQuoteCheckout(
          supabase,
          workspaceOwnerId,
          documentId
        );
      }
    }

    const resolvedInvoiceId = invoiceId;
    if (!workspaceOwnerId || !resolvedInvoiceId) {
      console.warn("Stripe checkout: missing workspace or invoice", {
        workspaceOwnerId,
        invoiceId: resolvedInvoiceId,
        documentId,
      });
      return Response.json({ received: true });
    }

    const category = await getCategoryBySlug(
      supabase,
      workspaceOwnerId,
      "income",
      "quote_payment"
    );

    const tx = await recordStripeFinanceTransaction(supabase, {
      workspaceOwnerId,
      invoiceId: resolvedInvoiceId,
      paymentLinkId: paymentLinkId ?? undefined,
      contactId: contactId ?? undefined,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: normalizeCurrency(session.currency),
      source: paymentLinkId ? "stripe_payment_link" : "stripe_checkout",
      stripePaymentIntentId: session.payment_intent
        ? String(session.payment_intent)
        : null,
      stripeCheckoutSessionId: session.id,
      categoryId: category?.id,
      description: paymentLinkId ? "Stripe payment link" : "Quote checkout payment",
    });

    if (paymentLinkId && tx?.id) {
      await supabase
        .from("payment_links")
        .update({ transaction_id: tx.id })
        .eq("id", paymentLinkId);
    }

    await recalculateInvoicePaymentStatus(supabase, workspaceOwnerId, resolvedInvoiceId);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const documentId = intent.metadata?.document_id;
    const metadataInvoiceId = intent.metadata?.invoice_id ?? null;

    if (!documentId && !metadataInvoiceId) {
      return Response.json({ received: true });
    }

    let workspaceOwnerId: string | null = null;
    let contactId: string | null = null;
    let resolvedPiInvoiceId: string | null = metadataInvoiceId;

    if (metadataInvoiceId) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("user_id, contact_id")
        .eq("id", metadataInvoiceId)
        .maybeSingle();
      workspaceOwnerId = (invoice?.user_id as string) ?? null;
      contactId = (invoice?.contact_id as string | null) ?? null;
    } else if (documentId) {
      const { data: doc } = await supabase
        .from("documents")
        .select("user_id, contact_id")
        .eq("id", documentId)
        .maybeSingle();
      workspaceOwnerId = doc?.user_id as string;
      contactId = (doc?.contact_id as string | null) ?? null;

      if (workspaceOwnerId) {
        resolvedPiInvoiceId = await ensureInvoiceForQuoteCheckout(
          supabase,
          workspaceOwnerId,
          documentId
        );
      }
    }

    if (!workspaceOwnerId || !resolvedPiInvoiceId) {
      return Response.json({ received: true });
    }

    const category = await getCategoryBySlug(
      supabase,
      workspaceOwnerId,
      "income",
      "quote_payment"
    );

    await recordStripeFinanceTransaction(supabase, {
      workspaceOwnerId,
      invoiceId: resolvedPiInvoiceId,
      contactId: contactId ?? undefined,
      amount: intent.amount ? intent.amount / 100 : 0,
      currency: normalizeCurrency(intent.currency),
      source: "stripe_checkout",
      stripePaymentIntentId: intent.id,
      categoryId: category?.id,
      description: "Stripe payment",
    });

    await recalculateInvoicePaymentStatus(supabase, workspaceOwnerId, resolvedPiInvoiceId);
  }

  return Response.json({ received: true });
}
