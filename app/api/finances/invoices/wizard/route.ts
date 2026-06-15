import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { executeInvoiceWizard, type InvoiceWizardInput } from "@/lib/finances/invoice-wizard";
import { INVOICE_TYPES } from "@/lib/finances/invoice-types";
import { humanizeDbError } from "@/lib/validation-errors";

const typeIds = INVOICE_TYPES.map((t) => t.id) as [string, ...string[]];

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  line_total: z.number().min(0),
});

const wizardSchema = z
  .object({
    invoice_type: z.enum(typeIds),
    quote_id: z.string().uuid().optional().nullable(),
    contact_id: z.string().uuid(),
    line_items: z.array(lineItemSchema).min(1),
    subtotal: z.number().min(0),
    tax_rate: z.number().min(0).default(0),
    tax_amount: z.number().min(0).default(0),
    discount_amount: z.number().min(0).default(0),
    total: z.number().positive(),
    currency: z.enum(["USD", "MXN"]).default("USD"),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    footer_text: z.string().max(4000).optional().nullable(),
    collection_method: z.enum(["manual", "payment_link"]),
  })
  .superRefine((data, ctx) => {
    if (data.invoice_type === "quote" && !data.quote_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quote_id is required for quote invoices.",
        path: ["quote_id"],
      });
    }
  });

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const parsed = wizardSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const result = await executeInvoiceWizard(
      supabase,
      workspaceOwnerId!,
      userId!,
      parsed.data as InvoiceWizardInput
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create invoice.";
    console.error("POST /api/finances/invoices/wizard:", err);
    return NextResponse.json({ error: humanizeDbError(message) }, { status: 422 });
  }
}
