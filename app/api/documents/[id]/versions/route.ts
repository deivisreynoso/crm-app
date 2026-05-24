import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id: documentId } = await context.params;
    const supabase = createServerSideClient();

    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("document_versions")
      .select("id, version_number, content, file_url, created_at")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false });

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/documents/[id]/versions:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
