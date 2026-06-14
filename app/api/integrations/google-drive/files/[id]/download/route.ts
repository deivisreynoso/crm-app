import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { downloadGoogleDriveFileForAttachment } from "@/lib/google/drive";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id: fileId } = await context.params;
    if (!fileId?.trim()) {
      return NextResponse.json({ error: "File id required" }, { status: 400 });
    }

    const content = await downloadGoogleDriveFileForAttachment(
      workspaceOwnerId!,
      fileId.trim()
    );

    if (!content) {
      return NextResponse.json(
        {
          error:
            "This Drive file cannot be downloaded as an attachment. Insert a link instead.",
          link_only: true,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      filename: content.filename,
      mime_type: content.mimeType,
      content_base64: content.buffer.toString("base64"),
      web_view_link: content.webViewLink ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    console.error("GET google drive download:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
