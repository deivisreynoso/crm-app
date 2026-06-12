import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { documentPatchSchema } from "@/lib/validators";
import { formatValidationDetails } from "@/lib/validation-errors";
import { resolveDocumentFileUrl } from "@/lib/storage/documents";
import { snapshotDocumentVersion } from "@/lib/documents/versioning";
import {
  assertParentsInWorkspace,
  workspaceParentForbidden,
} from "@/lib/api/assert-workspace-parents";
import { coerceQuoteDocumentType, isQuoteDocument } from "@/lib/documents/kinds";
import { ensureQuoteReference } from "@/lib/quotes/reference";
import { getLatestQuotePayment } from "@/lib/integrations/stripe/record-quote-payment";

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

    const { data: lineItems } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("document_id", id)
      .order("sort_order");

    const file_url = await resolveDocumentFileUrl(
      supabase,
      data.storage_path as string | undefined,
      data.file_url as string | undefined
    );

    let quote_reference = data.quote_reference as string | null | undefined;
    if (isQuoteDocument(data.type as string) && !quote_reference?.trim()) {
      quote_reference = await ensureQuoteReference(supabase, {
        id: data.id,
        user_id: workspaceOwnerId!,
        type: data.type as string,
        quote_reference: null,
      });
    }

    let quote_payment = null;
    if (isQuoteDocument(data.type as string)) {
      quote_payment = await getLatestQuotePayment(supabase, workspaceOwnerId!, id);
    }

    return NextResponse.json({
      ...data,
      quote_reference: quote_reference ?? data.quote_reference,
      file_url: file_url ?? data.file_url,
      line_items: lineItems ?? [],
      quote_payment,
    });
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

    const parentCheck = await assertParentsInWorkspace(supabase, workspaceOwnerId!, {
      contact_id: parsed.data.contact_id,
      company_id: parsed.data.company_id,
      opportunity_id: parsed.data.opportunity_id,
    });
    const parentError = workspaceParentForbidden(parentCheck);
    if (parentError) return parentError;

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
    if (d.type !== undefined) {
      updates.type = coerceQuoteDocumentType(d.type);
    }
    if (d.title !== undefined) updates.title = d.title;
    if (d.content !== undefined) updates.content = d.content?.trim() || null;
    if (d.status !== undefined) updates.status = d.status;
    if (d.valid_until !== undefined) {
      updates.valid_until = d.valid_until?.trim() ? d.valid_until : null;
    }
    if (d.subtotal !== undefined) updates.subtotal = d.subtotal;
    if (d.tax_rate !== undefined) updates.tax_rate = d.tax_rate;
    if (d.tax_amount !== undefined) updates.tax_amount = d.tax_amount;
    if (d.total_amount !== undefined) updates.total_amount = d.total_amount;
    if (d.header_html !== undefined) {
      updates.header_html = d.header_html?.trim() ? d.header_html : null;
    }
    if (d.footer_html !== undefined) {
      updates.footer_html = d.footer_html?.trim() ? d.footer_html : null;
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
    const { data: deleted, error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select("id")
      .maybeSingle();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    if (!deleted) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/documents/[id]:", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
