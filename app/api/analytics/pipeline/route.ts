import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getPipelineAnalytics } from "@/lib/analytics/pipeline";

export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const pipelineId = params.get("pipeline_id") ?? undefined;

    const data = await getPipelineAnalytics(userId!, pipelineId ?? undefined, {
      startDate: params.get("start_date") ?? undefined,
      endDate: params.get("end_date") ?? undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/analytics/pipeline:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
