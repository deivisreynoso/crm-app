import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { documentPatchSchema } from "@/lib/validators";
import { formatValidationDetails } from "@/lib/validation-errors";
import { resolveDocumentFileUrl } from "@/lib/storage/documents";
import { snapshotDocumentVersion } from "@/lib/documents/versioning";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const file_url = await resolveDocumentFileUrl(
      supabase,
      data.storage_path as string | undefined,
      data.file_url as string | undefined
    );

    return NextResponse.json({ ...data, file_url: file_url ?? data.file_url });
  } catch (err) {
    console.error("GET /api/documents/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = documentPatchSchema.safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Validation failed" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data: existing } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (parsed.data.content !== undefined && parsed.data.content !== existing.content) {
      try {
        await snapshotDocumentVersion(supabase, workspaceOwnerId!, existing);
      } catch (versionErr) {
        console.warn("Document version snapshot skipped:", versionErr);
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const d = parsed.data;
    if (d.contact_id !== undefined) {
      updates.contact_id = d.contact_id?.trim() ? d.contact_id : null;
    }
    if (d.company_id !== undefined) {
      updates.company_id = d.company_id?.trim() ? d.company_id : null;
    }
    if (d.opportunity_id !== undefined) {
      updates.opportunity_id = d.opportunity_id?.trim() ? d.opportunity_id : null;
    }
    if (d.type !== undefined) updates.type = d.type;
    if (d.title !== undefined) updates.title = d.title;
    if (d.content !== undefined) updates.content = d.content?.trim() || null;
    if (d.status !== undefined) updates.status = d.status;
    if (d.valid_until !== undefined) {
      updates.valid_until = d.valid_until?.trim() ? d.valid_until : null;
    }

    const { data, error: dbError } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/documents/[id]:", err);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/documents/[id]:", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
