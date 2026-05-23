import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { resolveDocumentContent } from "@/lib/documents/load-context";
import { generateTextPdf } from "@/lib/documents/pdf";
import {
  uploadToDocumentsBucket,
} from "@/lib/storage/documents";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId!)
      .single();

    if (dbError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const bodyText = await resolveDocumentContent(supabase, doc);
    const pdfBuffer = await generateTextPdf({
      title: doc.title as string,
      body: bodyText || "(No content)",
    });

    const fileName = `${(doc.title as string).replace(/[^\w.-]+/g, "_")}.pdf`;
    const file = new File([new Uint8Array(pdfBuffer)], fileName, {
      type: "application/pdf",
    });

    const uploaded = await uploadToDocumentsBucket(
      supabase,
      userId!,
      `${id}-pdf`,
      file
    );

    await supabase
      .from("documents")
      .update({
        storage_path: uploaded.storagePath,
        file_url: uploaded.fileUrl,
        file_name: fileName,
        mime_type: "application/pdf",
        file_size_bytes: pdfBuffer.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({
      file_url: uploaded.fileUrl,
      file_name: fileName,
    });
  } catch (err) {
    console.error("POST /api/documents/[id]/pdf:", err);
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
