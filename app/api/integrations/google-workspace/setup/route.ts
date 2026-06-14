import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { buildGoogleWorkspaceSetup } from "@/lib/google/workspace-setup";

/** Setup checklist for Google Workspace + Gmail (per-user mailbox). Safe to call before OAuth is configured. */
export async function GET(req: Request) {
  try {
    const { userId, workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const setup = await buildGoogleWorkspaceSetup(
      req.url,
      userId!,
      workspaceOwnerId!
    );
    return NextResponse.json(setup);
  } catch (err) {
    console.error("GET /api/integrations/google-workspace/setup:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
