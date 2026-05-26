import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { getQuoteAnalytics } from "@/lib/quotes/analytics";

export async function GET() {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const analytics = await getQuoteAnalytics(supabase, workspaceOwnerId!);
    return NextResponse.json({ data: analytics });
  } catch (err) {
    console.error("GET /api/quotes/analytics:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
