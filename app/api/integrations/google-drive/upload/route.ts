import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { uploadGoogleDriveFile } from "@/lib/google/drive";

export async function POST(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const formData = await req.formData();
    const file = formData.get("file");
    const folderId = formData.get("folder_id");
    const driveId = formData.get("drive_id");

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadGoogleDriveFile(workspaceOwnerId!, {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      folderId: typeof folderId === "string" ? folderId : null,
      driveId: typeof driveId === "string" ? driveId : null,
    });

    return NextResponse.json(uploaded, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not upload to Google Drive";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
