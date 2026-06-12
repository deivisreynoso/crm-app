import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { toCsv } from "@/lib/finances/csv";
import { createServerSideClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const status = params.get("status");
    const contactId = params.get("contact_id");
    const quoteId = params.get("quote_id");

    const supabase = createServerSideClient();
    let query = supabase
      .from("invoices")
      .select(
        `
        invoice_number,
        status,
        total,
        currency,
        due_date,
        sent_at,
        paid_at,
        created_at,
        contact:contacts(first_name, last_name, email),
        quote:documents(quote_reference, title)
      `
      )
      .eq("user_id", workspaceOwnerId!)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (status) query = query.eq("status", status);
    if (contactId) query = query.eq("contact_id", contactId);
    if (quoteId) query = query.eq("quote_id", quoteId);

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const rows = (data ?? []).map((inv) => {
      const contact = inv.contact as {
        first_name?: string;
        last_name?: string;
        email?: string;
      } | null;
      const quote = inv.quote as { quote_reference?: string; title?: string } | null;
      const contactName = contact
        ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
        : "";
      return [
        inv.invoice_number,
        inv.status,
        inv.total,
        inv.currency,
        inv.due_date ?? "",
        inv.sent_at ?? "",
        inv.paid_at ?? "",
        inv.created_at,
        contactName,
        contact?.email ?? "",
        quote?.quote_reference ?? "",
        quote?.title ?? "",
      ];
    });

    const csv = toCsv(
      [
        "invoice_number",
        "status",
        "total",
        "currency",
        "due_date",
        "sent_at",
        "paid_at",
        "created_at",
        "contact_name",
        "contact_email",
        "quote_reference",
        "quote_title",
      ],
      rows
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="invoices.csv"',
      },
    });
  } catch (err) {
    console.error("GET /api/finances/invoices/export:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
