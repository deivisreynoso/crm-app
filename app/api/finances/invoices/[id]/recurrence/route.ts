import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit/record";

type RouteContext = { params: Promise<{ id: string }> };

const recurrenceSchema = z.object({
  frequency: z.enum(["weekly", "monthly", "annually"]),
  interval: z.number().int().min(1).default(1),
  next_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } =
      await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const { id } = await context.params;
    const parsed = recurrenceSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid recurrence rule." }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("invoices")
      .update({
        recurrence_rule: parsed.data,
        is_recurring_parent: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "invoice.recurrence_set",
      entityType: "invoice",
      entityId: id,
      newValues: parsed.data as Record<string, unknown>,
      changeSummary: "Invoice recurrence enabled",
      req,
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("POST invoice recurrence:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } =
      await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: invoice } = await supabase
      .from("invoices")
      .select("recurrence_rule")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const rule = (invoice.recurrence_rule as Record<string, unknown> | null) ?? {};

    const { data, error: dbError } = await supabase
      .from("invoices")
      .update({
        recurrence_rule: { ...rule, end_date: today },
        is_recurring_parent: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "invoice.recurrence_stopped",
      entityType: "invoice",
      entityId: id,
      changeSummary: "Invoice recurrence stopped",
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("DELETE invoice recurrence:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
