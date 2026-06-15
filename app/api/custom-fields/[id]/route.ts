import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { customFieldSchema } from "@/lib/validators";
import { formatValidationDetails } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = customFieldSchema.partial().safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Validation failed" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.entity_type !== undefined) updates.entity_type = d.entity_type;
    if (d.field_name !== undefined) updates.field_name = d.field_name.trim();
    if (d.field_type !== undefined) updates.field_type = d.field_type;
    if (d.is_required !== undefined) updates.is_required = d.is_required;
    if (d.options !== undefined) updates.options = d.options;
    if (d.validation !== undefined) updates.validation = d.validation;
    if (d.display_order !== undefined) updates.display_order = d.display_order;
    if (d.placeholder !== undefined) {
      updates.placeholder = d.placeholder?.trim() || null;
    }
    if (d.description !== undefined) {
      updates.description = d.description?.trim() || null;
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("custom_fields")
      .update(updates)
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/custom-fields/[id]:", err);
    return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("custom_fields")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/custom-fields/[id]:", err);
    return NextResponse.json({ error: "Failed to delete custom field" }, { status: 500 });
  }
}
