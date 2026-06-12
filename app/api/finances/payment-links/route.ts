import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { recordAuditLog } from "@/lib/audit/record";
import { createServerSideClient } from "@/lib/supabase";
import { createStripePaymentLink } from "@/lib/integrations/stripe/payment-link";
import { isStripeConfigured } from "@/lib/integrations/stripe/client";
import { getInvoiceBalance } from "@/lib/finances/invoice-balance";
import { humanizeDbError } from "@/lib/validation-errors";
import type { FinanceCurrency } from "@/lib/finances/transactions";

const createSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(["USD", "MXN"]),
  contact_id: z.string().uuid().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const status = params.get("status");
    const invoiceId = params.get("invoice_id");
    const limit = Math.min(200, Math.max(1, Number(params.get("limit") || "100")));

    const supabase = createServerSideClient();
    let query = supabase
      .from("payment_links")
      .select(
        `
        *,
        contact:contacts(id, first_name, last_name),
        invoice:invoices(id, invoice_number, total, quote_id)
      `
      )
      .eq("user_id", workspaceOwnerId!)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (invoiceId) query = query.eq("invoice_id", invoiceId);

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET payment-links:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;
    const supabase = createServerSideClient();

    const { data: invoice } = await supabase
      .from("invoices")
      .select("invoice_number, contact_id, status, total")
      .eq("id", body.invoice_id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    if (invoice.status === "voided") {
      return NextResponse.json({ error: "Cannot create payment link for a voided invoice." }, { status: 422 });
    }
    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice is already paid in full." }, { status: 422 });
    }

    const { balanceDue } = await getInvoiceBalance(supabase, workspaceOwnerId!, body.invoice_id);
    if (balanceDue <= 0) {
      return NextResponse.json({ error: "Invoice has no remaining balance." }, { status: 422 });
    }
    if (body.amount > balanceDue + 0.001) {
      return NextResponse.json(
        {
          error: `Link amount cannot exceed balance due (${balanceDue.toFixed(2)}). Create a partial payment link instead.`,
        },
        { status: 422 }
      );
    }

    const { data: activeLink } = await supabase
      .from("payment_links")
      .select("id")
      .eq("invoice_id", body.invoice_id)
      .eq("status", "active")
      .maybeSingle();

    if (activeLink) {
      return NextResponse.json(
        { error: "An active payment link already exists for this invoice." },
        { status: 422 }
      );
    }

    const contactId = body.contact_id ?? (invoice.contact_id as string | null);
    const title = `Invoice ${invoice.invoice_number}`;

    const { data: linkRow, error: insertError } = await supabase
      .from("payment_links")
      .insert({
        user_id: workspaceOwnerId!,
        invoice_id: body.invoice_id,
        contact_id: contactId,
        amount: body.amount,
        currency: body.currency,
        url: "pending",
        status: "active",
        created_by: userId,
      })
      .select()
      .single();

    if (insertError || !linkRow) {
      return NextResponse.json({ error: humanizeDbError(insertError?.message ?? "Insert failed") }, { status: 500 });
    }

    const stripeLink = await createStripePaymentLink({
      amountCents: Math.round(body.amount * 100),
      currency: body.currency as FinanceCurrency,
      title,
      metadata: {
        workspace_user_id: workspaceOwnerId!,
        payment_link_id: linkRow.id as string,
        invoice_id: body.invoice_id,
      },
    });

    const { data: updated, error: updateError } = await supabase
      .from("payment_links")
      .update({
        stripe_payment_link_id: stripeLink.id,
        url: stripeLink.url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", linkRow.id)
      .select(
        `
        *,
        contact:contacts(id, first_name, last_name),
        invoice:invoices(id, invoice_number, quote_id)
      `
      )
      .single();

    if (updateError) {
      return NextResponse.json({ error: humanizeDbError(updateError.message) }, { status: 500 });
    }

    await supabase
      .from("invoices")
      .update({ payment_link_id: linkRow.id, updated_at: new Date().toISOString() })
      .eq("id", body.invoice_id);

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "payment_link.created",
      entityType: "payment_link",
      entityId: linkRow.id as string,
      entityName: title,
      changeSummary: `Created payment link for ${title} (${body.amount} ${body.currency})`,
      req,
    });

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (err) {
    console.error("POST payment-links:", err);
    const message = err instanceof Error ? err.message : "Could not create payment link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
