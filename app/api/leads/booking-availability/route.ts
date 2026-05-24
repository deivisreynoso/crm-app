import { NextResponse } from "next/server";
import {
  DEFAULT_BOOKING_AVAILABILITY,
  formatAvailabilityHint,
  getBookingAvailabilityForWebsite,
} from "@/lib/website/booking-availability";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get("lang") === "en" ? "en" : "es";
    const config = await getBookingAvailabilityForWebsite();

    const now = new Date();
    const minDate = new Date(
      now.getTime() + config.min_notice_hours * 3_600_000
    );
    const maxDate = new Date(
      now.getTime() + config.max_days_ahead * 24 * 3_600_000
    );

    const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

    return NextResponse.json({
      ...config,
      hint: formatAvailabilityHint(config, lang),
      min_date: toDateInput(minDate),
      max_date: toDateInput(maxDate),
      defaults: DEFAULT_BOOKING_AVAILABILITY,
    });
  } catch (err) {
    console.error("GET /api/leads/booking-availability:", err);
    return NextResponse.json(
      { ...DEFAULT_BOOKING_AVAILABILITY, hint: "" },
      { status: 200 }
    );
  }
}
