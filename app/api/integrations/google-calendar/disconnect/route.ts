import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

export async function DELETE() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", userId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE google-calendar disconnect:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
