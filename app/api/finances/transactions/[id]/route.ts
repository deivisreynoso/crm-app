import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { canViewExpenseData } from "@/lib/finances/access";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("finance_transactions")
      .select(
        `
        *,
        category:finance_categories(id, label, kind, slug),
        contact:contacts(id, first_name, last_name, email),
        quote:documents(id, title, quote_reference)
      `
      )
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (data.type === "expense" && !canViewExpenseData(role!, isWorkspaceOwner)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET /api/finances/transactions/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
