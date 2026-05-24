import { NextRequest, NextResponse } from "next/server";
import { getBookingOffers } from "@/lib/website/booking-offers";
import { requireWebsiteLeadAuth } from "@/lib/website/lead-api-auth";

/**
 * GHL parity: calendar.getFreeSlots + "Format Available Slots"
 *
 * GET /api/leads/booking-offers?lang=es&reschedule=false&limit=3
 * Header: x-website-secret
 */
export async function GET(req: NextRequest) {
  const auth = requireWebsiteLeadAuth(req);
  if (auth.error) return auth.error;

  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get("lang") === "en" ? "en" : "es";
    const reschedule = url.searchParams.get("reschedule") === "true";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 3, 1), 12) : undefined;

    const result = await getBookingOffers({ lang, reschedule, limit });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/leads/booking-offers:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to load booking offers",
        available_slots: [],
        offers: [],
        message: "",
      },
      { status: 500 }
    );
  }
}
