import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import {
  generateInvoicePdfBuffer,
  storeInvoicePdf,
  type InvoiceLineItem,
} from "@/lib/finances/invoices";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data: invoice, error: dbError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (dbError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.pdf_storage_path) {
      const { data: signed } = await supabase.storage
        .from("crm_documents")
        .createSignedUrl(invoice.pdf_storage_path as string, 3600);
      if (signed?.signedUrl) {
        return NextResponse.json({ file_url: signed.signedUrl, cached: true });
      }
    }

    const pdf = await generateInvoicePdfBuffer(
      supabase,
      {
        id: invoice.id as string,
        invoice_number: invoice.invoice_number as string,
        line_items: (invoice.line_items as InvoiceLineItem[]) ?? [],
        subtotal: Number(invoice.subtotal),
        tax_rate: Number(invoice.tax_rate),
        tax_amount: Number(invoice.tax_amount),
        total: Number(invoice.total),
        currency: invoice.currency as string,
        due_date: invoice.due_date as string | null,
        notes: invoice.notes as string | null,
        footer_text: invoice.footer_text as string | null,
        contact_id: invoice.contact_id as string,
      },
      workspaceOwnerId!
    );

    const uploaded = await storeInvoicePdf(supabase, workspaceOwnerId!, id, pdf);
    return NextResponse.json({ file_url: uploaded.fileUrl, file_name: pdf.fileName });
  } catch (err) {
    console.error("GET invoice pdf:", err);
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
