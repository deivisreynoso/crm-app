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

    const { count: unreadCount, error: unreadError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId!)
      .eq("is_read", false);

    if (unreadError) {
      return NextResponse.json({ error: unreadError.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], unreadCount: unreadCount ?? 0 });
  } catch (err) {
    console.error("GET /api/notifications:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/notifications:", err);
    return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 });
  }
}
