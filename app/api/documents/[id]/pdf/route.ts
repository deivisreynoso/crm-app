import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { generateDocumentPdfBuffer } from "@/lib/documents/generate-document-pdf-buffer";
import {
  uploadToDocumentsBucket,
} from "@/lib/storage/documents";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { buffer: pdfBuffer, fileName } = await generateDocumentPdfBuffer(
      supabase,
      {
        id: doc.id,
        type: doc.type as string,
        title: doc.title as string,
        quote_reference: doc.quote_reference as string | null | undefined,
        content: doc.content,
        contact_id: doc.contact_id,
        company_id: doc.company_id,
        opportunity_id: doc.opportunity_id,
        valid_until: doc.valid_until,
        header_html: doc.header_html,
        footer_html: doc.footer_html,
        subtotal: doc.subtotal,
        tax_rate: doc.tax_rate,
        tax_amount: doc.tax_amount,
        total_amount: doc.total_amount,
      },
      workspaceOwnerId!
    );
    const file = new File([new Uint8Array(pdfBuffer)], fileName, {
      type: "application/pdf",
    });

    const uploaded = await uploadToDocumentsBucket(
      supabase,
      workspaceOwnerId!,
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
