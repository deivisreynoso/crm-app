import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import { createLeadFromWebsite } from "@/lib/leads/website-leads";
import {
  leadContactInfoSchema,
  leadQualificationSchema,
  type LeadQualificationPayload,
} from "@/lib/leads/lead-schemas";
import { requireWebsiteLeadAuth } from "@/lib/website/lead-api-auth";
import {
  getBookingAvailabilityForWebsite,
  isBookingSlotAvailable,
} from "@/lib/website/booking-availability";
import { getClickIn360OrgUserId } from "@/lib/org/constants";

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

  const ip = clientIpFromRequest(req);
  const limit = checkRateLimit(`lead-webchat:${ip}`, 20, 3_600_000);
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

  try {
    const body = await req.json();
    const parsed = webchatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const cal = parsed.data.calendar_selection;
    if (cal?.date && cal?.time && !parsed.data.reschedule) {
      const ownerId = getClickIn360OrgUserId();
      const availability = await getBookingAvailabilityForWebsite();
      const slotCheck = await isBookingSlotAvailable(
        cal.date,
        cal.time,
        availability,
        ownerId
      );
      if (!slotCheck.ok) {
        return NextResponse.json(
          { error: slotCheck.message, code: slotCheck.code },
          { status: 409 }
        );
      }
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
