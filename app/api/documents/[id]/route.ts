import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", userId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/documents/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
