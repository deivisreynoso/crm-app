import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { resolveDocumentFileUrl } from "@/lib/storage/documents";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .select("id, file_url, storage_path, file_name")
      .eq("id", id)
      .eq("user_id", userId!)
      .single();

    if (dbError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const url = await resolveDocumentFileUrl(
      supabase,
      doc.storage_path,
      doc.file_url
    );

    if (!url) {
      return NextResponse.json({ error: "No file attached" }, { status: 404 });
    }

    return NextResponse.redirect(url);
  } catch (err) {
    console.error("GET /api/documents/[id]/file error:", err);
    return NextResponse.json({ error: "Failed to open file" }, { status: 500 });
  }
}
