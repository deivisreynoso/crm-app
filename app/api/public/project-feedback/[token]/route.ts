import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import { projectFeedbackSchema } from "@/lib/validators";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { buildProjectWebhookContact } from "@/lib/project-stages/webhook-contact";
import { resolveProjectStagesSettings } from "@/lib/project-stages/defaults";
import { sendProjectFeedbackThankYou } from "@/lib/project-stages/feedback-email";
import { fireWebhook } from "@/lib/webhooks/outbound";
import { resolveContactCommunicationLocale } from "@/lib/contacts/communication-locale";
import { resolveWorkspaceBranding } from "@/lib/branding/workspace-branding";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = createServerSideClient();

    const { data: opportunity } = await supabase
      .from("opportunities")
      .select(
        "id, feedback_received_at, user_id, contact_id, contact:contacts(id, first_name, last_name, email, preferred_language)"
      )
      .eq("project_feedback_token", token.trim())
      .maybeSingle();

    if (!opportunity) {
      return NextResponse.json({ error: "Feedback link not found" }, { status: 404 });
    }

    const contact = opportunity.contact as {
      first_name?: string;
      last_name?: string;
      preferred_language?: string | null;
    } | null;

    const locale = resolveContactCommunicationLocale(contact?.preferred_language);
    const branding = await resolveWorkspaceBranding(
      supabase,
      opportunity.user_id as string
    );

    return NextResponse.json({
      contact: {
        first_name: contact?.first_name ?? "",
        last_name: contact?.last_name ?? "",
      },
      branding,
      locale,
      already_submitted: Boolean(opportunity.feedback_received_at),
    });
  } catch (err) {
    console.error("GET /api/public/project-feedback/[token]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = checkRateLimit(`project-feedback:${ip}`, 10, 3_600_000);
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
    const parsed = projectFeedbackSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: opportunity } = await supabase
      .from("opportunities")
      .select(
        "id, title, user_id, contact_id, feedback_received_at, project_feedback_token"
      )
      .eq("project_feedback_token", token.trim())
      .maybeSingle();

    if (!opportunity) {
      return NextResponse.json({ error: "Feedback link not found" }, { status: 404 });
    }

    if (opportunity.feedback_received_at) {
      return NextResponse.json(
        { error: "Feedback has already been submitted" },
        { status: 409 }
      );
    }

    const { data: contact } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, preferred_language")
      .eq("id", opportunity.contact_id)
      .maybeSingle();

    if (!contact?.email) {
      return NextResponse.json(
        { error: "Contact email not available" },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();
    const feedbackNotes = {
      what_worked: parsed.data.what_worked?.trim() || null,
      what_to_improve: parsed.data.what_to_improve?.trim() || null,
      would_recommend: parsed.data.would_recommend,
    };

    const { data: updated, error: updateError } = await supabase
      .from("opportunities")
      .update({
        feedback_score: parsed.data.score,
        feedback_notes: feedbackNotes,
        feedback_received_at: now,
        updated_at: now,
      })
      .eq("id", opportunity.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const locale = resolveContactCommunicationLocale(contact.preferred_language);

    const { data: feedbackRow, error: insertError } = await supabase
      .from("project_feedback")
      .insert([
        {
          contact_id: opportunity.contact_id,
          opportunity_id: opportunity.id,
          feedback_token: token.trim(),
          score: parsed.data.score,
          what_worked_well: parsed.data.what_worked?.trim() || null,
          what_to_improve: parsed.data.what_to_improve?.trim() || null,
          would_recommend: parsed.data.would_recommend,
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      console.error("project_feedback insert:", insertError.message);
    }

    await logContactActivity(supabase, {
      userId: opportunity.user_id as string,
      contactId: opportunity.contact_id as string,
      type: "project_feedback",
      description: `Project feedback received — ${parsed.data.score}/5`,
      metadata: {
        opportunity_id: opportunity.id,
        project_feedback_id: feedbackRow?.id,
        feedback_score: parsed.data.score,
      },
    });

    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("quote_company_name, project_stages_settings")
      .eq("user_id", opportunity.user_id)
      .maybeSingle();

    const projectSettings = resolveProjectStagesSettings(
      userSettings?.project_stages_settings
    );

    const webhookContact = await buildProjectWebhookContact(
      supabase,
      opportunity.user_id as string,
      opportunity.contact_id as string,
      {
        project_feedback_token: opportunity.project_feedback_token,
        feedback_score: parsed.data.score,
        feedback_notes: feedbackNotes,
      }
    );

    void fireWebhook(supabase, opportunity.user_id as string, "project.feedback_received", {
      opportunity_id: opportunity.id,
      opportunity: updated,
      contact: webhookContact,
      feedback_score: parsed.data.score,
      feedback_notes: feedbackNotes,
      project_feedback_id: feedbackRow?.id,
      project_stages_settings: projectSettings,
    });

    try {
      await sendProjectFeedbackThankYou({
        locale,
        firstName: (contact.first_name as string) || "there",
        to: contact.email as string,
      });
    } catch (emailErr) {
      console.error("project feedback thank-you email:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/public/project-feedback/[token]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
