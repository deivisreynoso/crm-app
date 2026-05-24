import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bookDiscoveryCall } from "@/lib/leads/book-appointment";
import { resolveSlotStart } from "@/lib/website/booking-slots-core";
import { requireWebsiteLeadAuth } from "@/lib/website/lead-api-auth";

const contactInfoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  company: z.string().optional(),
});

const qualificationSchema = z
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
  .optional();

const bookingSchema = z.object({
  contact_info: contactInfoSchema,
  qualification: qualificationSchema,
  ai_insights: qualificationSchema,
  /** ISO 8601 start (GHL selected_slot) */
  slot_start: z.string().optional(),
  /** 1-based index into offered_slots (N8N session available_slots) */
  slot_index: z.coerce.number().int().min(1).max(12).optional(),
  /** Copy from GET /api/leads/booking-offers → available_slots */
  offered_slots: z.array(z.string()).optional(),
  conversation_transcript: z.string().optional(),
  source: z.enum(["webchat", "whatsapp", "form"]).optional(),
  channel: z.string().optional(),
  language: z.string().optional(),
  ga_client_id: z.string().optional(),
  visitor_id: z.string().optional(),
});

/**
 * GHL parity: create contact + book appointment in CRM calendar
 *
 * POST /api/leads/bookings
 * Header: x-website-secret
 */
export async function POST(req: NextRequest) {
  const auth = requireWebsiteLeadAuth(req);
  if (auth.error) return auth.error;

  let requestLang: "es" | "en" = "es";

  try {
    const body = await req.json();
    requestLang = body.language === "en" ? "en" : "es";
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const slotStart = resolveSlotStart({
      slot_start: parsed.data.slot_start,
      slot_index: parsed.data.slot_index,
      offered_slots: parsed.data.offered_slots,
    });

    if (!slotStart) {
      return NextResponse.json(
        {
          error:
            requestLang === "es"
              ? "Indica slot_start (ISO) o slot_index con offered_slots."
              : "Provide slot_start (ISO) or slot_index with offered_slots.",
          code: "missing_slot",
        },
        { status: 400 }
      );
    }

    const q = parsed.data.qualification ?? parsed.data.ai_insights ?? {};
    const source =
      parsed.data.source ??
      (parsed.data.channel === "whatsapp" ? "whatsapp" : "webchat");

    const result = await bookDiscoveryCall(
      {
        contact_info: parsed.data.contact_info,
        qualification: {
          platform: q?.platform,
          friction_area: q?.friction_area,
          communication_channels: q?.communication_channels,
          signals: q?.signals,
          ai_summary: q?.ai_summary,
          recommended_offer: q?.recommended_offer,
          qualified: q?.qualified,
          confidence_score: q?.confidence_score,
        },
        slot_start: slotStart,
        conversation_transcript: parsed.data.conversation_transcript ?? null,
        source,
        ga_client_id: parsed.data.ga_client_id ?? parsed.data.visitor_id ?? null,
      },
      { lang: requestLang }
    );

    const confirmationMessage =
      requestLang === "es"
        ? `Listo, tu llamada quedó agendada.\n\n📅 ${result.slot_label}\n🕐 ${result.timezone.replace(/_/g, " ")}`
        : `Your call is booked.\n\n📅 ${result.slot_label}\n🕐 ${result.timezone.replace(/_/g, " ")}`;

    return NextResponse.json(
      {
        ...result,
        booking_confirmed_at: new Date().toISOString(),
        confirmation_message: confirmationMessage,
        next_action: "booked",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/leads/bookings:", err);
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : undefined;
    const message = err instanceof Error ? err.message : "Failed to book appointment";

    if (code === "slot_unavailable") {
      return NextResponse.json(
        {
          error:
            requestLang === "es"
              ? "Ese horario ya no está disponible. Pide nuevas opciones con booking-offers."
              : "That time is no longer available. Fetch new options from booking-offers.",
          code,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message, code }, { status: 500 });
  }
}
