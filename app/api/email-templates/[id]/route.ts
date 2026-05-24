import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { emailTemplateSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = emailTemplateSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationDetails(parsed.error.flatten()) || "Invalid input" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const d = parsed.data;
    if (d.name !== undefined) updates.name = d.name.trim();
    if (d.subject !== undefined) updates.subject = d.subject.trim();
    if (d.body !== undefined) updates.body = d.body;
    if (d.category !== undefined) updates.category = d.category?.trim() || null;
    if (d.is_default !== undefined) updates.is_default = d.is_default;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("email_templates")
      .update(updates)
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/email-templates/[id]:", err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/email-templates/[id]:", err);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
