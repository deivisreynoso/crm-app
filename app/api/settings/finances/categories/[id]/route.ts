import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  label: z.string().min(1).max(100),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("finance_categories")
      .update({ label: parsed.data.label, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH finance category:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data: cat } = await supabase
      .from("finance_categories")
      .select("is_system")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    if (cat.is_system) {
      return NextResponse.json({ error: "System categories cannot be deleted." }, { status: 400 });
    }

    const { count } = await supabase
      .from("finance_transactions")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "Category is in use by transactions." }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from("finance_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE finance category:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
