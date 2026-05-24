import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const unreadOnly = new URL(req.url).searchParams.get("unread") === "true";
    const supabase = createServerSideClient();
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json(
        {
          error: dbError.message,
          hint: "Run migration 010_phase3_mvp_foundation.sql in Supabase.",
        },
        { status: 500 }
      );
    }

    const unreadCount = (data ?? []).filter((n) => !n.is_read).length;
    return NextResponse.json({ data: data ?? [], unreadCount });
  } catch (err) {
    console.error("GET /api/notifications:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
