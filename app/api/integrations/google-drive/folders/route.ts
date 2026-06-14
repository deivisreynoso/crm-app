import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createGoogleDriveFolder } from "@/lib/google/drive";

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  folder_id: z.string().optional().nullable(),
  drive_id: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
    }

    const folder = await createGoogleDriveFolder(
      workspaceOwnerId!,
      parsed.data.name,
      parsed.data.folder_id,
      parsed.data.drive_id
    );

    return NextResponse.json(folder, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create Google Drive folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
