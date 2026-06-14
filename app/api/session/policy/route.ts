import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

/** Session policy readable by any workspace member (not manage-only). */
export async function GET() {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data } = await supabase
      .from("user_settings")
      .select("session_timeout_hours")
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    return NextResponse.json({
      session_timeout_hours: (data?.session_timeout_hours as number | null) ?? null,
    });
  } catch (err) {
    console.error("GET /api/session/policy:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
