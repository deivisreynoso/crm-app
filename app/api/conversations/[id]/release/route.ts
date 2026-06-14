import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { getConversationForWorkspace } from "@/lib/conversations/queries";
import { createServerSideClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
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

    const now = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from("conversations")
      .update({
        handler: "ai",
        handler_user_id: null,
        human_review_requested: false,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select("*")
      .single();

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to release conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("POST /api/conversations/[id]/release:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
