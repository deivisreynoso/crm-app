import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

const recurrenceSchema = z.object({
  frequency: z.enum(["weekly", "monthly", "annually"]),
  interval: z.number().int().min(1).default(1),
  next_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const parsed = recurrenceSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid recurrence rule." }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: tx } = await supabase
      .from("finance_transactions")
      .select("id, type")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (tx.type !== "expense") {
      return NextResponse.json({ error: "Only expense transactions can recur." }, { status: 400 });
    }

    const { data, error: dbError } = await supabase
      .from("finance_transactions")
      .update({
        recurrence_rule: parsed.data,
        is_recurring_parent: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("POST recurrence:", err);
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
    const { data: tx } = await supabase
      .from("finance_transactions")
      .select("recurrence_rule")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const rule = (tx.recurrence_rule as Record<string, unknown> | null) ?? {};
    const today = new Date().toISOString().slice(0, 10);

    const { error: dbError } = await supabase
      .from("finance_transactions")
      .update({
        recurrence_rule: { ...rule, end_date: today },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE recurrence:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
