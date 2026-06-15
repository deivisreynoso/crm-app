import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { resolveContactCommunicationLocale } from "@/lib/contacts/communication-locale";
import { CLICKIN360_BRAND } from "@/lib/brand";
import { z } from "zod";

type RouteContext = { params: Promise<{ token: string }> };

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(4000).optional(),
  would_recommend: z.boolean().optional(),
  locale: z.enum(["en", "es"]).optional(),
});

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, preferred_language, user_id")
      .eq("feedback_token", token.trim())
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Feedback link not found" }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("quote_company_name, ui_locale, google_reviews_url")
      .eq("user_id", contact.user_id)
      .maybeSingle();

    return NextResponse.json({
      contact: {
        first_name: contact.first_name,
        last_name: contact.last_name,
      },
      company_name: CLICKIN360_BRAND,
      google_reviews_url: settings?.google_reviews_url ?? null,
      locale: resolveContactCommunicationLocale(contact.preferred_language),
    });
  } catch (err) {
    console.error("GET /api/public/feedback/[token]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const parsed = feedbackSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, user_id, first_name, last_name, email")
      .eq("feedback_token", token.trim())
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Feedback link not found" }, { status: 404 });
    }

    const { logContactActivity } = await import("@/lib/activities/log-contact-activity");
    await logContactActivity(supabase, {
      userId: contact.user_id as string,
      contactId: contact.id as string,
      type: "system",
      description: `Customer feedback submitted (${parsed.data.rating}/5)`,
      metadata: {
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
        would_recommend: parsed.data.would_recommend ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/public/feedback/[token]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
