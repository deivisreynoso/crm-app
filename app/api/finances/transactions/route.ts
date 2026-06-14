import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { canViewExpenseData } from "@/lib/finances/access";
import { ensureFinanceCategories } from "@/lib/finances/categories";
import { processDueRecurringTransactions } from "@/lib/finances/recurrence";
import { getInvoiceBalance } from "@/lib/finances/invoice-balance";
import { recalculateInvoicePaymentStatus } from "@/lib/finances/invoice-payment-status";
import { humanizeDbError } from "@/lib/validation-errors";

const createSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z.number().positive(),
    currency: z.enum(["USD", "MXN"]),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category_id: z.string().uuid(),
    contact_id: z.string().uuid().optional().nullable(),
    invoice_id: z.string().uuid().optional().nullable(),
    quote_id: z.string().uuid().optional().nullable(),
    description: z.string().max(2000).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    payment_method: z.string().max(100).optional().nullable(),
    vendor_name: z.string().max(200).optional().nullable(),
    recurrence_rule: z
      .object({
        frequency: z.enum(["weekly", "monthly", "annually"]),
        interval: z.number().int().min(1).default(1),
        next_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
      })
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "income") {
      if (!data.invoice_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "invoice_id is required for income.",
          path: ["invoice_id"],
        });
      }
      if (data.quote_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "quote_id cannot be set on income; it is derived from the invoice.",
          path: ["quote_id"],
        });
      }
    }
  });

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    await processDueRecurringTransactions(supabase, workspaceOwnerId!);

    const params = new URL(req.url).searchParams;
    const type = params.get("type");
    const status = params.get("status");
    const categoryId = params.get("category_id");
    const contactId = params.get("contact_id");
    const quoteId = params.get("quote_id");
    const invoiceId = params.get("invoice_id");
    const from = params.get("from");
    const to = params.get("to");
    const limit = Math.min(200, Math.max(1, Number(params.get("limit") || "100")));

    let query = supabase
      .from("finance_transactions")
      .select(
        `
        *,
        category:finance_categories(id, label, kind, slug),
        contact:contacts(id, first_name, last_name),
        quote:documents(id, title, quote_reference),
        invoice:invoices(id, invoice_number, quote_id)
      `
      )
      .eq("user_id", workspaceOwnerId!)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!canViewExpenseData(role!, isWorkspaceOwner)) {
      query = query.neq("type", "expense");
    } else if (type === "income" || type === "expense") {
      query = query.eq("type", type);
    }

    if (status) query = query.eq("status", status);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (contactId) query = query.eq("contact_id", contactId);
    if (quoteId) query = query.eq("quote_id", quoteId);
    if (invoiceId) query = query.eq("invoice_id", invoiceId);
    if (from) query = query.gte("transaction_date", from);
    if (to) query = query.lte("transaction_date", to);

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/finances/transactions:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    if (body.type === "income" && !body.contact_id) {
      return NextResponse.json({ error: "contact_id is required for income." }, { status: 400 });
    }

    const supabase = createServerSideClient();
    await ensureFinanceCategories(supabase, workspaceOwnerId!);

    if (body.type === "income" && body.invoice_id) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, status")
        .eq("id", body.invoice_id)
        .eq("user_id", workspaceOwnerId!)
        .maybeSingle();

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
      }
      if (invoice.status === "voided") {
        return NextResponse.json({ error: "Cannot log payment against a voided invoice." }, { status: 422 });
      }
      if (invoice.status === "paid") {
        return NextResponse.json({ error: "Invoice is already paid in full." }, { status: 422 });
      }

      const { balanceDue } = await getInvoiceBalance(
        supabase,
        workspaceOwnerId!,
        body.invoice_id
      );
      if (body.amount > balanceDue + 0.001) {
        return NextResponse.json(
          {
            error: `Payment exceeds balance due (${balanceDue.toFixed(2)}). Log a partial payment instead.`,
          },
          { status: 422 }
        );
      }
    }

    const direction = body.type === "income" ? "inbound" : "outbound";
    const isRecurringParent = body.type === "expense" && !!body.recurrence_rule;

    const { data: inserted, error: insertError } = await supabase
      .from("finance_transactions")
      .insert({
        user_id: workspaceOwnerId!,
        type: body.type,
        category_id: body.category_id,
        amount: body.amount,
        currency: body.currency,
        status: "completed",
        source: "manual",
        direction,
        contact_id: body.contact_id ?? null,
        invoice_id: body.type === "income" ? body.invoice_id : null,
        description: body.description ?? null,
        notes: body.notes ?? null,
        payment_method: body.payment_method ?? null,
        vendor_name: body.vendor_name ?? null,
        transaction_date: body.transaction_date,
        recorded_by: userId,
        recurrence_rule: body.recurrence_rule ?? null,
        is_recurring_parent: isRecurringParent,
      })
      .select(
        `
        *,
        category:finance_categories(id, label, kind, slug),
        contact:contacts(id, first_name, last_name),
        invoice:invoices(id, invoice_number, quote_id),
        quote:documents(id, title, quote_reference)
      `
      )
      .single();

    if (insertError) {
      return NextResponse.json({ error: humanizeDbError(insertError.message) }, { status: 500 });
    }

    if (body.type === "income" && body.invoice_id) {
      await recalculateInvoicePaymentStatus(supabase, workspaceOwnerId!, body.invoice_id, {
        lastPaymentAmount: body.amount,
        paymentSource: "manual",
      });
    }

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finances/transactions:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
