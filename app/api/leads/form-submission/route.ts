import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLeadFromWebsite } from "@/lib/leads/website-leads";
import {
  getBookingAvailabilityForWebsite,
  isBookingSlotAvailable,
  validateBookingSlot,
} from "@/lib/website/booking-availability";

const formSchema = z.object({
  contact_info: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
    company: z.string().optional(),
  }),
  qualification: z
    .object({
      platform: z.string().optional(),
      friction_area: z.union([z.array(z.string()), z.string()]).optional(),
      communication_channels: z.union([z.array(z.string()), z.string()]).optional(),
      friction_point: z.string().optional(),
    })
    .optional(),
  calendar_selection: z
    .object({
      date: z.string(),
      time: z.string(),
      timezone: z.string().optional(),
    })
    .optional(),
  source: z.literal("form").optional(),
  language: z.string().optional(),
  ga_client_id: z.string().optional(),
});

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return process.env.NODE_ENV === "development";
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let requestLang: "es" | "en" = "es";

  try {
    const body = await req.json();
    requestLang = body.language === "en" ? "en" : "es";
    const parsed = formSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const q = parsed.data.qualification ?? {};
    const cal = parsed.data.calendar_selection;

    if (cal?.date && cal?.time) {
      const availability = await getBookingAvailabilityForWebsite();
      const ownerId = process.env.WEBSITE_LEADS_USER_ID?.trim();
      const slotCheck = ownerId
        ? await isBookingSlotAvailable(cal.date, cal.time, availability, ownerId)
        : validateBookingSlot(cal.date, cal.time, availability);
      if (!slotCheck.ok) {
        const message =
          requestLang === "es"
            ? slotCheck.code === "slot_unavailable"
              ? "Ese horario ya no está disponible. Elige otro de la lista."
              : slotCheck.code === "day_unavailable"
              ? "Ese día no está disponible. Elige un día laboral."
              : slotCheck.code === "outside_hours"
                ? `Horario no disponible. Elige entre ${availability.start_time} y ${availability.end_time}.`
                : slotCheck.code === "too_soon"
                  ? `Reserva con al menos ${availability.min_notice_hours} horas de anticipación.`
                  : slotCheck.code === "too_far"
                    ? `Elige una fecha dentro de los próximos ${availability.max_days_ahead} días.`
                    : "Fecha u hora no válida."
            : slotCheck.message;
        return NextResponse.json(
          { error: message, code: slotCheck.code },
          { status: 400 }
        );
      }
    }

    const result = await createLeadFromWebsite({
      source: "form",
      contact_info: parsed.data.contact_info,
      qualification: {
        platform: q.platform,
        friction_area: q.friction_area,
        communication_channels: q.communication_channels,
        friction_point: q.friction_point,
        ai_summary: cal
          ? `Requested call: ${cal.date} ${cal.time} (${cal.timezone ?? "local"})`
          : null,
      },
      calendar_selection: cal ?? null,
      ga_client_id: parsed.data.ga_client_id ?? null,
      language: requestLang,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/leads/form-submission:", err);
    const raw =
      err instanceof Error ? err.message : "Failed to process form submission";

    if (raw.toLowerCase().includes("unique") && raw.toLowerCase().includes("email")) {
      return NextResponse.json(
        {
          error:
            requestLang === "es"
              ? "Ya tenemos tu correo registrado. Intenta de nuevo en un momento o escríbenos por el chat."
              : "We already have your email on file. Please try again shortly or reach us via chat.",
          code: "duplicate_email",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: raw }, { status: 500 });
  }
}
