import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import { resolveContactCommunicationLocale } from "@/lib/contacts/communication-locale";
import { submitQuestionnaireSchema } from "@/lib/onboarding/questionnaire-schema";
import { fireWebhook } from "@/lib/webhooks/outbound";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import {
  buildSuggestedStack,
  mapQuestionnaireToOnboardingRow,
  type EscalationChannel,
} from "@/lib/onboarding/store-response";
import { emailOnboardingCompletedToSales } from "@/lib/onboarding/notify-sales";
import { createNotification } from "@/lib/notifications/create-notification";
import { listSalesGroupMemberIds } from "@/lib/notifications/workspace-groups";
import { updateOpportunityProjectStage } from "@/lib/project-stages/update-stage";
import { findContactProjectOpportunity } from "@/lib/project-stages/contact-opportunity";
import { resolveWorkspaceBranding } from "@/lib/branding/workspace-branding";

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
      .select(
        "quote_company_name, quote_primary_color, quote_font_family, quote_logo_storage_path, onboarding_task_template, ui_locale"
      )
      .eq("user_id", contact.user_id)
      .maybeSingle();

    const branding = await resolveWorkspaceBranding(supabase, contact.user_id as string);

    return NextResponse.json({
      contact: {
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
      },
      branding,
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
    const ip = clientIpFromRequest(req);
    const limit = checkRateLimit(`onboarding-submit:${ip}`, 10, 3_600_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: limit.retryAfterSec
            ? { "Retry-After": String(limit.retryAfterSec) }
            : undefined,
        }
      );
    }

    const { token } = await context.params;
    const body = await req.json();
    const parsed = submitQuestionnaireSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select(
        "id, user_id, first_name, last_name, email, preferred_language, onboarding_token"
      )
      .eq("onboarding_token", token.trim())
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Onboarding link not found" }, { status: 404 });
    }

    const workspaceOwnerId = contact.user_id as string;
    const now = new Date().toISOString();
    await supabase
      .from("contacts")
      .update({
        onboarding_completed_at: now,
        updated_at: now,
      })
      .eq("id", contact.id);

    const locale = resolveContactCommunicationLocale(contact.preferred_language);
    const extra = body as {
      escalation_channel?: EscalationChannel;
      website_url?: string;
      brand_colors?: string;
      logo_storage_path?: string;
      additional_notes?: string;
      suggested_integrations?: ReturnType<typeof buildSuggestedStack>;
    };

    const escalationChannel = extra.escalation_channel ?? null;
    const suggestedIntegrations =
      extra.suggested_integrations ??
      buildSuggestedStack({
        ecommerce_platform: parsed.data.responses.ecommerce.platform,
        escalation_channel: escalationChannel,
        pain_points: parsed.data.responses.goals,
      });

    const { data: opps } = await supabase
      .from("opportunities")
      .select("*, contact:contacts(*)")
      .eq("contact_id", contact.id)
      .eq("user_id", workspaceOwnerId)
      .order("updated_at", { ascending: false });

    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("*")
      .eq("user_id", workspaceOwnerId);

    const projectMatch = findContactProjectOpportunity(
      (opps ?? []) as Parameters<typeof findContactProjectOpportunity>[0],
      pipelines ?? []
    );

    const opportunityId = projectMatch?.opportunity.id ?? null;

    const row = mapQuestionnaireToOnboardingRow({
      contactId: contact.id as string,
      opportunityId,
      onboardingToken: token.trim(),
      preferredLanguage: contact.preferred_language as string | null,
      responses: parsed.data.responses,
      escalationChannel,
      suggestedIntegrations,
      websiteUrl: extra.website_url,
      brandColors: extra.brand_colors,
      logoStoragePath: extra.logo_storage_path,
      additionalNotes: extra.additional_notes,
    });

    await supabase.from("onboarding_responses").insert([row]);

    const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || "Contact";

    await logContactActivity(supabase, {
      userId: workspaceOwnerId,
      contactId: contact.id as string,
      type: "onboarding",
      description: "Onboarding questionnaire completed",
      metadata: { opportunity_id: opportunityId },
    });

    if (opportunityId && projectMatch?.opportunity.project_stage === "onboarding") {
      await updateOpportunityProjectStage(supabase, {
        workspaceOwnerId,
        actorUserId: workspaceOwnerId,
        opportunityId,
        stage: "design",
      });

      await logContactActivity(supabase, {
        userId: workspaceOwnerId,
        contactId: contact.id as string,
        type: "system",
        description: "Project stage: Onboarding → Design (questionnaire completed)",
        metadata: { opportunity_id: opportunityId, from_stage: "onboarding", to_stage: "design" },
      });

      void fireWebhook(supabase, workspaceOwnerId, "project.stage_changed", {
        opportunity_id: opportunityId,
        contact_id: contact.id,
        from_stage: "onboarding",
        to_stage: "design",
        contact,
      });
    }

    const memberIds = await listSalesGroupMemberIds(supabase, workspaceOwnerId);
    for (const memberId of memberIds) {
      await createNotification(supabase, memberId, {
        kind: "opportunity_reminder",
        title: `Onboarding questionnaire completed by ${contactName}`,
        message: contactName,
        related_entity_type: "contact",
        related_entity_id: contact.id as string,
      });
    }

    void emailOnboardingCompletedToSales(supabase, workspaceOwnerId, {
      contactName,
      contactEmail: contact.email as string | null,
      contactId: contact.id as string,
      businessName: row.business_name,
      platform: row.ecommerce_platform,
      painPoints: (row.pain_points as string[] | null) ?? null,
      escalationChannel,
      suggestedStack: suggestedIntegrations,
      additionalNotes: row.additional_notes,
    });

    void fireWebhook(supabase, workspaceOwnerId, "questionnaire.submitted", {
      contact_id: contact.id,
      contact,
      responses: parsed.data.responses,
      locale,
      escalation_channel: escalationChannel,
      suggested_integrations: suggestedIntegrations,
    });

    void fireWebhook(supabase, workspaceOwnerId, "onboarding.complete", {
      contact_id: contact.id,
      contact,
      completed_at: now,
    });

    return NextResponse.json({ success: true, completed_at: now, show_booking: true });
  } catch (err) {
    console.error("POST /api/public/onboarding/[token]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
