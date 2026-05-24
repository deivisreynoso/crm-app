import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { savedFilterSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const entityType = new URL(req.url).searchParams.get("entity_type");
    const supabase = createServerSideClient();
    let query = supabase
      .from("saved_filters")
      .select("*")
      .eq("user_id", workspaceOwnerId!)
      .order("name");

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/saved-filters:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = savedFilterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationDetails(parsed.error.flatten()) || "Invalid input" },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("saved_filters")
      .insert({
        user_id: workspaceOwnerId!,
        name: parsed.data.name.trim(),
        entity_type: parsed.data.entity_type,
        filter_config: parsed.data.filter_config,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/saved-filters:", err);
    return NextResponse.json({ error: "Failed to save filter" }, { status: 500 });
  }
}
