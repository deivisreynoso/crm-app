import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage, requireWorkspaceOwner } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { ownerDeleteInvoice } from "@/lib/finances/delete-invoice";
import { markOverdueInvoices } from "@/lib/finances/invoices";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  line_items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unit_price: z.number().min(0),
    line_total: z.number().min(0),
  })).optional(),
  subtotal: z.number().min(0).optional(),
  tax_rate: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  currency: z.enum(["USD", "MXN"]).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  footer_text: z.string().max(4000).optional().nullable(),
  contact_id: z.string().uuid().optional(),
});

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    await markOverdueInvoices(supabase, workspaceOwnerId!);

    const { data, error: dbError } = await supabase
      .from("invoices")
      .select(
        `
        *,
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
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET invoice:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    const { data: existing } = await supabase
      .from("invoices")
      .select("status")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (existing.status !== "draft") {
      return NextResponse.json({ error: "Only draft invoices can be edited." }, { status: 400 });
    }

    const { data, error: dbError } = await supabase
      .from("invoices")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH invoice:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const ownerError = requireWorkspaceOwner(isWorkspaceOwner);
    if (ownerError) return ownerError;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    try {
      await ownerDeleteInvoice(supabase, workspaceOwnerId!, id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      const status = message === "Invoice not found" ? 404 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE invoice:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
