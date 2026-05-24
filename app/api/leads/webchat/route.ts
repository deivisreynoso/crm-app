import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLeadFromWebsite } from "@/lib/leads/website-leads";
import { requireWebsiteLeadAuth } from "@/lib/website/lead-api-auth";

const webchatSchema = z.object({
  contact_info: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
    company: z.string().optional(),
  }),
  ai_insights: z
    .object({
      platform: z.string().optional(),
      friction_area: z.union([z.array(z.string()), z.string()]).optional(),
      communication_channels: z.union([z.array(z.string()), z.string()]).optional(),
      signals: z.string().optional(),
      ai_summary: z.string().optional(),
      recommended_offer: z.string().optional(),
      qualified: z.boolean().optional(),
      confidence_score: z.number().optional(),
    })
    .optional(),
  conversation_transcript: z.string().optional(),
  source: z.literal("webchat").optional(),
  ga_client_id: z.string().optional(),
  visitor_id: z.string().optional(),
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

    const q = parsed.data.ai_insights ?? {};

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
      ga_client_id: parsed.data.ga_client_id ?? parsed.data.visitor_id ?? null,
      conversation_transcript: parsed.data.conversation_transcript ?? null,
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
