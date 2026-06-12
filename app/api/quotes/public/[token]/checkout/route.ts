import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { loadPublicQuoteByToken } from "@/lib/quotes/load-public-quote";
import { createQuoteCheckoutSession } from "@/lib/integrations/stripe/checkout-session";
import { isStripeConfigured } from "@/lib/integrations/stripe/client";
import { z } from "zod";

type RouteContext = { params: Promise<{ token: string }> };

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest, context: RouteContext) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }

  const { token } = await context.params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const supabase = createServerSideClient();
  const quote = await loadPublicQuoteByToken(supabase, token);
  if (!quote) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  if (quote.status !== "accepted" && !quote.accepted_at) {
    return NextResponse.json(
      { error: "Accept the quote before paying." },
      { status: 400 }
    );
  }

  const amountCents = Math.round(quote.total_amount * 100);
  if (amountCents < 50) {
    return NextResponse.json({ error: "Quote total is too small to charge." }, { status: 400 });
  }

  try {
    const session = await createQuoteCheckoutSession({
      documentId: quote.id,
      token,
      amountCents,
      currency: quote.currency || "USD",
      customerEmail: parsed.data.email,
      quoteTitle: quote.title,
      quoteReference: quote.quote_reference,
    });

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("POST quote checkout:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start checkout." },
      { status: 500 }
    );
  }
}
