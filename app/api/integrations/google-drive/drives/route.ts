import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { listGoogleSharedDrives } from "@/lib/google/drive";

export async function GET() {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const drives = await listGoogleSharedDrives(workspaceOwnerId!);

    return NextResponse.json({ drives });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load shared drives";
    const status = /not connected/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
