import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { resolveContactCommunicationLocale } from "@/lib/contacts/communication-locale";
import { CLICKIN360_BRAND } from "@/lib/brand";
import { submitQuestionnaireSchema } from "@/lib/onboarding/questionnaire-schema";
import { fireWebhook } from "@/lib/webhooks/outbound";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, email, phone, company, preferred_language, onboarding_started_at, onboarding_completed_at, user_id"
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
        phone: contact.phone,
        company: contact.company,
      },
      company_name: CLICKIN360_BRAND,
      locale: resolveContactCommunicationLocale(contact.preferred_language),
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
    const parsed = submitQuestionnaireSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, user_id, first_name, last_name, email, preferred_language")
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

    const locale = resolveContactCommunicationLocale(contact.preferred_language);

    void fireWebhook(supabase, contact.user_id as string, "questionnaire.submitted", {
      contact_id: contact.id,
      contact,
      responses: parsed.data.responses,
      locale,
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
