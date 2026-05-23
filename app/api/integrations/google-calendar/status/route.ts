import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("id")
      .eq("user_id", userId!)
      .maybeSingle();

    return NextResponse.json({ connected: !!data });
  } catch (err) {
    console.error("GET google-calendar status:", err);
    return NextResponse.json({ connected: false });
  }
}
