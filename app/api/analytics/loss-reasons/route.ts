import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

export async function GET() {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data: docs } = await supabase
      .from("documents")
      .select("loss_reason")
      .eq("user_id", workspaceOwnerId!)
      .eq("status", "rejected")
      .not("loss_reason", "is", null);

    const counts: Record<string, number> = {};
    for (const row of docs ?? []) {
      const key = (row.loss_reason as string) || "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const chart = Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ data: chart, total: docs?.length ?? 0 });
  } catch (err) {
    console.error("GET /api/analytics/loss-reasons:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
