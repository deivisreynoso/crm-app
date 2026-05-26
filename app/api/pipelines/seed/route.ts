import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { ensureDefaultPipeline } from "@/lib/pipelines/ensure-default";

/** Create default sales pipeline when workspace has none (explicit setup, not on GET). */
export async function POST() {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const data = await ensureDefaultPipeline(supabase, workspaceOwnerId!);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("POST /api/pipelines/seed:", err);
    return NextResponse.json(
      { error: "Failed to initialize pipeline" },
      { status: 500 }
    );
  }
}
