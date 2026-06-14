import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLeadFromWebsite } from "@/lib/leads/website-leads";
import {
  leadContactInfoSchema,
  leadQualificationSchema,
  type LeadQualificationPayload,
} from "@/lib/leads/lead-schemas";
import { requireWebsiteLeadAuth } from "@/lib/website/lead-api-auth";

const webchatSchema = z.object({
  contact_info: leadContactInfoSchema,
  ai_insights: leadQualificationSchema,
  conversation_transcript: z.string().optional(),
  calendar_selection: z
    .object({
      date: z.string(),
      time: z.string(),
      timezone: z.string().optional(),
    })
    .optional(),
  language: z.enum(["en", "es"]).optional(),
  source: z.literal("webchat").optional(),
  ga_client_id: z.string().optional(),
  visitor_id: z.string().optional(),
  reschedule: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const auth = requireWebsiteLeadAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = webchatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const q = (parsed.data.ai_insights ?? {}) as LeadQualificationPayload;

    const requestLang = parsed.data.language === "en" ? "en" : "es";

    const result = await createLeadFromWebsite({
      source: "webchat",
      contact_info: parsed.data.contact_info,
      qualification: {
        platform: q.platform,
        friction_area: q.friction_area,
        communication_channels: q.communication_channels,
        signals: q.signals,
        ai_summary: q.ai_summary,
        recommended_offer: q.recommended_offer,
        qualified: q.qualified,
        confidence_score: q.confidence_score,
      },
      calendar_selection: parsed.data.calendar_selection ?? null,
      ga_client_id: parsed.data.ga_client_id ?? parsed.data.visitor_id ?? null,
      conversation_transcript: parsed.data.conversation_transcript ?? null,
      language: requestLang,
      reschedule: parsed.data.reschedule ?? false,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/leads/webchat:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to process webchat lead",
      },
      { status: 500 }
    );
  }
}
