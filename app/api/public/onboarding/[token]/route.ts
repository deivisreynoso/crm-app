import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { fireWebhook } from "@/lib/webhooks/outbound";
import { z } from "zod";

type RouteContext = { params: Promise<{ token: string }> };

const submitSchema = z.object({
  responses: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  locale: z.enum(["en", "es"]).optional(),
});

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, email, preferred_language, onboarding_started_at, onboarding_completed_at, user_id"
      )
      .eq("onboarding_token", token.trim())
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Onboarding link not found" }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("quote_company_name, onboarding_task_template, ui_locale")
      .eq("user_id", contact.user_id)
      .maybeSingle();

    return NextResponse.json({
      contact: {
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
      },
      company_name: settings?.quote_company_name ?? "ClickIn 360",
      locale:
        contact.preferred_language === "en" || settings?.ui_locale === "en" ? "en" : "es",
      onboarding_started_at: contact.onboarding_started_at,
      onboarding_completed_at: contact.onboarding_completed_at,
      tasks: settings?.onboarding_task_template ?? [],
    });
  } catch (err) {
    console.error("GET /api/public/onboarding/[token]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const parsed = submitSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, user_id, first_name, last_name, email")
      .eq("onboarding_token", token.trim())
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Onboarding link not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    await supabase
      .from("contacts")
      .update({
        onboarding_completed_at: now,
        updated_at: now,
      })
      .eq("id", contact.id);

    void fireWebhook(supabase, contact.user_id as string, "questionnaire.submitted", {
      contact_id: contact.id,
      contact,
      responses: parsed.data.responses,
      locale: parsed.data.locale ?? "es",
    });

    void fireWebhook(supabase, contact.user_id as string, "onboarding.complete", {
      contact_id: contact.id,
      contact,
      completed_at: now,
    });

    return NextResponse.json({ success: true, completed_at: now });
  } catch (err) {
    console.error("POST /api/public/onboarding/[token]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
