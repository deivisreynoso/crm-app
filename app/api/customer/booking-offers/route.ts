import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { getBookingOffers } from "@/lib/website/booking-offers";

/**
 * Customer kickoff booking slots (onboarding Step 2).
 * GET /api/customer/booking-offers?token={onboarding_token}&lang=es
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, user_id, preferred_language")
      .eq("onboarding_token", token)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const lang =
      url.searchParams.get("lang") === "en"
        ? "en"
        : contact.preferred_language === "en"
          ? "en"
          : "es";

    const result = await getBookingOffers({
      lang,
      workspaceOwnerId: contact.user_id as string,
      limit: 6,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/customer/booking-offers:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load slots" },
      { status: 500 }
    );
  }
}
