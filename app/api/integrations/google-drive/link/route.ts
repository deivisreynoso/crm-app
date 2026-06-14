import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { getGoogleDriveFileMeta } from "@/lib/google/drive";
import {
  assertParentsInWorkspace,
  workspaceParentForbidden,
} from "@/lib/api/assert-workspace-parents";

const linkSchema = z.object({
  file_id: z.string().min(1),
  contact_id: z.string().uuid(),
  company_id: z.string().uuid().optional().or(z.literal("")),
  opportunity_id: z.string().uuid().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } =
      await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const body = await req.json();
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const parentCheck = await assertParentsInWorkspace(supabase, workspaceOwnerId!, {
      contact_id: parsed.data.contact_id,
      company_id: parsed.data.company_id || undefined,
      opportunity_id: parsed.data.opportunity_id || undefined,
    });
    const parentError = workspaceParentForbidden(parentCheck);
    if (parentError) return parentError;

    const meta = await getGoogleDriveFileMeta(
      workspaceOwnerId!,
      parsed.data.file_id
    );
    if (!meta || meta.isFolder) {
      return NextResponse.json({ error: "File not found in Drive" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: workspaceOwnerId!,
        type: "attachment",
        title: meta.name,
        file_name: meta.name,
        mime_type: meta.mimeType,
        file_size_bytes: meta.size ? Number(meta.size) : null,
        contact_id: parsed.data.contact_id,
        company_id: parsed.data.company_id?.trim() || null,
        opportunity_id: parsed.data.opportunity_id?.trim() || null,
        source: "google_drive",
        external_id: meta.id,
        external_url: meta.webViewLink ?? null,
        status: "draft",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Drive link insert:", dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST google drive link:", err);
    return NextResponse.json({ error: "Failed to link file" }, { status: 500 });
  }
}
