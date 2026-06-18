import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  resolveWorkspaceContext,
  workspaceCapabilities,
} from "@/lib/team/workspace";

export async function GET() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const ctx = await resolveWorkspaceContext(userId!);

    const caps = workspaceCapabilities(
      ctx.role,
      ctx.isWorkspaceOwner,
      ctx.effectivePermissions
    );

    return NextResponse.json({
      workspaceOwnerId: ctx.workspaceOwnerId,
      role: ctx.role,
      isWorkspaceOwner: ctx.isWorkspaceOwner,
      actorUserId: ctx.actorUserId,
      ...caps,
    });
  } catch (err) {
    console.error("GET /api/workspace/context:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
