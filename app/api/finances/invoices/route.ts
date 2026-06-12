import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import {
  assertNoActiveInvoiceForQuote,
  assertQuoteAcceptedForInvoice,
} from "@/lib/finances/invoices";
import { humanizeDbError } from "@/lib/validation-errors";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  line_total: z.number().min(0),
});

const createSchema = z.object({
  quote_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid(),
  line_items: z.array(lineItemSchema).min(1),
  subtotal: z.number().min(0),
  tax_rate: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  total: z.number().min(0),
  currency: z.enum(["USD", "MXN"]).default("USD"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  footer_text: z.string().max(4000).optional().nullable(),
  invoice_number: z.string().max(50).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const status = params.get("status");
    const quoteId = params.get("quote_id");
    const contactId = params.get("contact_id");
    const summary = params.get("summary") === "1";
    const limit = Math.min(200, Math.max(1, Number(params.get("limit") || "100")));

    const supabase = createServerSideClient();

    let query = supabase
      .from("invoices")
      .select(
        summary
          ? "id, quote_id, status, invoice_number, contact_id, total, currency"
          : `
        *,
        contact:contacts(id, first_name, last_name, email),
        quote:documents(id, title, quote_reference)
      `
      )
      .eq("user_id", workspaceOwnerId!)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (quoteId) query = query.eq("quote_id", quoteId);
    if (contactId) query = query.eq("contact_id", contactId);

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/finances/invoices:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    const supabase = createServerSideClient();

    if (body.quote_id) {
      const accepted = await assertQuoteAcceptedForInvoice(
        supabase,
        workspaceOwnerId!,
        body.quote_id
      );
      if (!accepted.ok) {
        return NextResponse.json({ error: accepted.reason }, { status: 422 });
      }

      const unique = await assertNoActiveInvoiceForQuote(
        supabase,
        workspaceOwnerId!,
        body.quote_id
      );
      if (!unique.ok) {
        return NextResponse.json({ error: unique.reason }, { status: 422 });
      }

      const { data: quote } = await supabase
        .from("documents")
        .select("id, contact_id")
        .eq("id", body.quote_id)
        .eq("user_id", workspaceOwnerId!)
        .maybeSingle();
      if (!quote) {
        return NextResponse.json({ error: "Quote not found." }, { status: 404 });
      }
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("invoice_default_due_days, invoice_default_footer_text, finance_default_tax_rate")
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    let dueDate = body.due_date;
    if (!dueDate && settings?.invoice_default_due_days) {
      const d = new Date();
      d.setDate(d.getDate() + Number(settings.invoice_default_due_days));
      dueDate = d.toISOString().slice(0, 10);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("invoices")
      .insert({
        user_id: workspaceOwnerId!,
        quote_id: body.quote_id ?? null,
        contact_id: body.contact_id,
        line_items: body.line_items,
        subtotal: body.subtotal,
        tax_rate: body.tax_rate ?? settings?.finance_default_tax_rate ?? 0,
        tax_amount: body.tax_amount,
        discount_amount: body.discount_amount ?? 0,
        total: body.total,
        currency: body.currency,
        due_date: dueDate ?? null,
        notes: body.notes ?? null,
        footer_text: body.footer_text ?? settings?.invoice_default_footer_text ?? null,
        invoice_number: body.invoice_number || "",
        status: "draft",
      })
      .select(
        `
        *,
        contact:contacts(id, first_name, last_name, email),
        quote:documents(id, title, quote_reference)
      `
      )
      .single();

    if (insertError) {
      const msg = humanizeDbError(insertError.message);
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "An active invoice already exists for this quote." }, { status: 422 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (err) {
    console.error("POST /api/finances/invoices:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
