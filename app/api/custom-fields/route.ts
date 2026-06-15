import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { customFieldSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";
import { insertWithColumnFallback } from "@/lib/api/strip-insert";

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const entityType = new URL(req.url).searchParams.get("entity_type");
    const supabase = createServerSideClient();
    let query = supabase
      .from("custom_fields")
      .select("*")
      .eq("user_id", workspaceOwnerId!)
      .order("display_order");

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json(
        {
          error: dbError.message,
          hint: "Run migration 010_phase3_mvp_foundation.sql if validation column is missing.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/custom-fields:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const body = await req.json();
    const parsed = customFieldSchema.safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Validation failed" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const row = {
      user_id: workspaceOwnerId!,
      entity_type: parsed.data.entity_type,
      field_name: parsed.data.field_name.trim(),
      field_type: parsed.data.field_type,
      is_required: parsed.data.is_required ?? false,
      options: parsed.data.options?.length ? parsed.data.options : null,
      validation: parsed.data.validation ?? {},
      display_order: parsed.data.display_order ?? 0,
      placeholder: parsed.data.placeholder?.trim() || null,
      description: parsed.data.description?.trim() || null,
    };

    const { data, error: dbError } = await insertWithColumnFallback(
      (payload) =>
        supabase.from("custom_fields").insert(payload).select().single(),
      row,
      ["placeholder", "description", "validation"]
    );

    if (dbError) {
      const hint = dbError.message.includes("field_type")
        ? "Run migrations 010 and 011 in Supabase (currency type / column updates)."
        : undefined;
      return NextResponse.json(
        { error: humanizeDbError(dbError.message), hint },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/custom-fields:", err);
    return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 });
  }
}
