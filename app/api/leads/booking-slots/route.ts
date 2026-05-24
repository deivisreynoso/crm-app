import { NextRequest, NextResponse } from "next/server";
import {
  getAvailableSlotsForDateWithCalendar,
  getBookingAvailabilityForWebsite,
} from "@/lib/website/booking-availability";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date")?.trim() ?? "";
    const lang = url.searchParams.get("lang") === "en" ? "en" : "es";

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const config = await getBookingAvailabilityForWebsite();
    const ownerId = process.env.WEBSITE_LEADS_USER_ID?.trim();
    const { slots, unavailable_reason } = ownerId
      ? await getAvailableSlotsForDateWithCalendar(date, config, lang, ownerId)
      : { slots: [], unavailable_reason: "invalid_date" as const };

    const messages: Record<string, { es: string; en: string }> = {
      day_unavailable: {
        es: "Este día no está disponible. Elige otro día.",
        en: "This day is not available. Please choose another date.",
      },
      invalid_date: {
        es: "Fecha no válida.",
        en: "Invalid date.",
      },
    };

    return NextResponse.json({
      date,
      slots,
      meeting_duration_minutes: config.meeting_duration_minutes,
      timezone: config.timezone,
      unavailable_reason: unavailable_reason ?? null,
      message: unavailable_reason
        ? messages[unavailable_reason]?.[lang] ?? null
        : slots.length === 0
          ? lang === "es"
            ? "No hay horarios disponibles este día. Prueba otra fecha."
            : "No times available on this day. Try another date."
          : null,
    });
  } catch (err) {
    console.error("GET /api/leads/booking-slots:", err);
    return NextResponse.json({ slots: [] }, { status: 500 });
  }
}
