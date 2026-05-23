import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { contactTagSchema } from "@/lib/validators";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = contactTagSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationDetails(parsed.error.flatten()) || "Invalid input" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.color !== undefined) updates.color = parsed.data.color;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("contact_tags")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId!)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/contact-tags/[id]:", err);
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("contact_tags")
      .delete()
      .eq("id", id)
      .eq("user_id", userId!);

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/contact-tags/[id]:", err);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
