import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const now = new Date().toISOString();

    const { data, error: dbError } = await supabase
      .from("invoices")
      .update({ status: "voided", voided_at: now, updated_at: now })
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .neq("status", "paid")
      .select()
      .maybeSingle();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Invoice not found or cannot be voided." }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("POST invoice void:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
