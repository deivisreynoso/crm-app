import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getOperationsMetrics } from "@/lib/analytics/operations";

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const data = await getOperationsMetrics(workspaceOwnerId!, {
      startDate: params.get("start_date") ?? undefined,
      endDate: params.get("end_date") ?? undefined,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/analytics/operations:", err);
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 });
  }
}
