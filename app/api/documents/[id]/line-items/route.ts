import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { quoteLineItemsPutSchema } from "@/lib/validators";
import { replaceQuoteLineItems } from "@/lib/quotes/sync-line-items";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data: doc } = await supabase
      .from("documents")
      .select("id, tax_rate, subtotal, tax_amount, total_amount")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { data: lines, error: dbError } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("document_id", id)
      .order("sort_order");

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      line_items: lines ?? [],
      tax_rate: doc.tax_rate ?? 0,
      subtotal: doc.subtotal ?? 0,
      tax_amount: doc.tax_amount ?? 0,
      total_amount: doc.total_amount ?? 0,
    });
  } catch (err) {
    console.error("GET line-items:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const parsed = quoteLineItemsPutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: formatValidationDetails(parsed.error.flatten()) || "Invalid input",
        },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const taxRate = parsed.data.tax_rate ?? 0;
    await supabase
      .from("documents")
      .update({ tax_rate: taxRate, updated_at: new Date().toISOString() })
      .eq("id", id);

    const serviceIds = Array.from(
      new Set(parsed.data.line_items.map((l) => l.service_id))
    );
    const { data: services, error: svcErr } = await supabase
      .from("quote_services")
      .select("id, name, unit_price")
      .eq("user_id", workspaceOwnerId!)
      .in("id", serviceIds);

    if (svcErr) {
      return NextResponse.json(
        { error: humanizeDbError(svcErr.message) },
        { status: 500 }
      );
    }

    const byId = new Map((services ?? []).map((s) => [s.id as string, s]));
    const missing = serviceIds.filter((sid) => !byId.has(sid));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "One or more catalog services were not found.",
          missing_service_ids: missing,
        },
        { status: 400 }
      );
    }

    const totals = await replaceQuoteLineItems(
      supabase,
      id,
      workspaceOwnerId!,
      parsed.data.line_items.map((l) => {
        const svc = byId.get(l.service_id)!;
        return {
          service_id: l.service_id,
          description: String(svc.name),
          quantity: l.quantity,
          unit_price: Number(svc.unit_price) || 0,
          sort_order: l.sort_order,
        };
      }),
      taxRate
    );

    const { data: lines } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("document_id", id)
      .order("sort_order");

    return NextResponse.json({
      line_items: lines ?? [],
      tax_rate: taxRate,
      ...totals,
    });
  } catch (err) {
    console.error("PUT line-items:", err);
    const message = err instanceof Error ? err.message : "Failed to save line items";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
