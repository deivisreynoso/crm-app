import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import {
  getConversationDetail,
  getConversationForWorkspace,
} from "@/lib/conversations/queries";
import { createServerSideClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const conversation = await getConversationDetail(
      supabase,
      workspaceOwnerId!,
      id
    );

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (err) {
    console.error("GET /api/conversations/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const conversation = await getConversationForWorkspace(
      supabase,
      workspaceOwnerId!,
      id
    );

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { error: dbError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/conversations/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
