import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { listConversations } from "@/lib/conversations/queries";
import { createServerSideClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const humanReviewParam = params.get("human_review");
    const humanReview =
      humanReviewParam === "true"
        ? true
        : humanReviewParam === "false"
          ? false
          : undefined;

    const supabase = createServerSideClient();
    const result = await listConversations(supabase, workspaceOwnerId!, {
      channel: params.get("channel") ?? undefined,
      status: params.get("status") ?? undefined,
      human_review: humanReview,
      search: params.get("search") ?? undefined,
      page: Number(params.get("page") || "1"),
      limit: Number(params.get("limit") || "50"),
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/conversations:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
