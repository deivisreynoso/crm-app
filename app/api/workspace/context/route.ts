import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { resolveWorkspaceContext } from "@/lib/team/workspace";

export async function GET() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const ctx = await resolveWorkspaceContext(userId!);

    return NextResponse.json({
      workspaceOwnerId: ctx.workspaceOwnerId,
      role: ctx.role,
      isWorkspaceOwner: ctx.isWorkspaceOwner,
      actorUserId: ctx.actorUserId,
    });
  } catch (err) {
    console.error("GET /api/workspace/context:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
