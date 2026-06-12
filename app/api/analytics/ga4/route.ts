import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { fetchGa4Dashboard, isGa4DataConfigured } from "@/lib/google/analytics-data";
import { z } from "zod";

const querySchema = z.object({
  days: z.enum(["7", "30", "90"]).optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  if (!isGa4DataConfigured()) {
    return NextResponse.json(
      { error: "Google Analytics Data API is not configured on the server." },
      { status: 503 }
    );
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  const days = parsed.success && parsed.data.days ? parsed.data.days : "30";

  try {
    const data = await fetchGa4Dashboard(days);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/analytics/ga4:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load analytics." },
      { status: 500 }
    );
  }
}
