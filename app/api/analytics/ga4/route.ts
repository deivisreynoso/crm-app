import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  fetchGa4Dashboard,
  isGa4DataConfigured,
  resolveGa4DateRange,
  type Ga4ReportRange,
} from "@/lib/google/analytics-data";
import { z } from "zod";

const querySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  const range = resolveGa4DateRange({
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    days: parsed.data.days as Ga4ReportRange | undefined,
  });

  try {
    const data = await fetchGa4Dashboard(range);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/analytics/ga4:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load analytics." },
      { status: 500 }
    );
  }
}
