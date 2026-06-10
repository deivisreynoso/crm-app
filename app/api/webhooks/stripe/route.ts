import { NextRequest, NextResponse } from "next/server";
import { verifyStripeWebhookSignature } from "@/lib/integrations/stripe/webhooks";
import { createServerSideClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = verifyStripeWebhookSignature(payload, signature);
  } catch (err) {
    console.error("Stripe webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!event) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as {
      id: string;
      amount?: number;
      metadata?: { document_id?: string };
    };
    const documentId = intent.metadata?.document_id;
    if (documentId) {
      const supabase = createServerSideClient();
      const { data: doc } = await supabase
        .from("documents")
        .select("user_id")
        .eq("id", documentId)
        .maybeSingle();

      if (doc?.user_id) {
        await supabase.from("payments").insert([
          {
            user_id: doc.user_id,
            amount: intent.amount ? intent.amount / 100 : 0,
            status: "completed",
            stripe_payment_id: intent.id,
          },
        ]);
      }
    }
  }

  return NextResponse.json({ received: true });
}
