import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { isStripeConfigured } from "@/lib/integrations/stripe";
import { humanizeDbError } from "@/lib/validation-errors";

const patchSchema = z.object({
  default_currency: z.enum(["USD", "MXN"]).optional(),
  finance_default_tax_rate: z.number().min(0).max(100).optional(),
  invoice_number_prefix: z.string().max(20).optional(),
  invoice_number_start: z.number().int().min(1).optional(),
  invoice_default_due_days: z.number().int().min(1).max(365).optional(),
  invoice_default_footer_text: z.string().max(4000).optional().nullable(),
});

export async function GET() {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("user_settings")
      .select(
        "default_currency, finance_default_tax_rate, invoice_number_prefix, invoice_number_start, invoice_default_due_days, invoice_default_footer_text, stripe_configured_at"
      )
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", workspaceOwnerId!);

    return NextResponse.json({
      data: {
        ...(data ?? {}),
        stripe_configured: isStripeConfigured(),
        invoice_number_locked: (count ?? 0) > 0,
      },
    });
  } catch (err) {
    console.error("GET settings/finances:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const patch = { ...parsed.data, updated_at: new Date().toISOString() };

    if (parsed.data.invoice_number_start !== undefined) {
      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", workspaceOwnerId!);
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: "Invoice starting number cannot be changed after invoices exist." },
          { status: 400 }
        );
      }
    }

    const { data, error: dbError } = await supabase
      .from("user_settings")
      .update(patch)
      .eq("user_id", workspaceOwnerId!)
      .select(
        "default_currency, finance_default_tax_rate, invoice_number_prefix, invoice_number_start, invoice_default_due_days, invoice_default_footer_text"
      )
      .single();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH settings/finances:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
