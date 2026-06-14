import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { listGoogleDriveFiles } from "@/lib/google/drive";

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const folderId = new URL(req.url).searchParams.get("folder_id");

    const { files, parentId } = await listGoogleDriveFiles(
      workspaceOwnerId!,
      folderId
    );

    return NextResponse.json({ files, parent_id: parentId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load Google Drive files";
    const status = /not connected/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
