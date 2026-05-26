import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { documentTemplateSchema } from "@/lib/validators";
import { coerceQuoteDocumentType } from "@/lib/documents/kinds";
import { formatValidationDetails } from "@/lib/validation-errors";

export async function GET() {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("user_id", workspaceOwnerId!)
      .order("name");

    if (dbError) {
      return NextResponse.json(
        {
          error: dbError.message,
          hint: "Run migration 010_phase3_mvp_foundation.sql in Supabase.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/document-templates:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = documentTemplateSchema.safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Validation failed" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("document_templates")
      .insert({
        user_id: workspaceOwnerId!,
        name: parsed.data.name,
        type: parsed.data.type
          ? coerceQuoteDocumentType(parsed.data.type)
          : null,
        content: parsed.data.content?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/document-templates:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
