import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const isRead = body.is_read === true;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("notifications")
      .update({ is_read: isRead })
      .eq("id", id)
      .eq("user_id", userId!)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/notifications/[id]:", err);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/notifications/[id]:", err);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
