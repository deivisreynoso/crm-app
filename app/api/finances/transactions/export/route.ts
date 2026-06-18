import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCrmDataExport } from "@/lib/api/auth";
import { canViewExpenseData } from "@/lib/finances/access";
import { toCsv } from "@/lib/finances/csv";
import { createServerSideClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, effectivePermissions, error } = await requireAuth();
    if (error) return error;
    const exportDenied = requireCrmDataExport(
      role!,
      isWorkspaceOwner,
      effectivePermissions
    );
    if (exportDenied) return exportDenied;

    const params = new URL(req.url).searchParams;
    const type = params.get("type");
    const status = params.get("status");
    const invoiceId = params.get("invoice_id");

    const supabase = createServerSideClient();
    const includeExpenses = canViewExpenseData(role!, isWorkspaceOwner);

    let query = supabase
      .from("finance_transactions")
      .select(
        `
        transaction_date,
        type,
        status,
        amount,
        currency,
        description,
        payment_method,
        vendor_name,
        contact:contacts(first_name, last_name),
        invoice:invoices(invoice_number),
        category:finance_categories(label)
      `
      )
      .eq("user_id", workspaceOwnerId!)
      .order("transaction_date", { ascending: false })
      .limit(5000);

    if (type) query = query.eq("type", type);
    if (status) query = query.eq("status", status);
    if (invoiceId) query = query.eq("invoice_id", invoiceId);
    if (!includeExpenses) query = query.eq("type", "income");

    const { data, error: dbError } = await query;
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const rows = (data ?? []).map((tx) => {
      const contact = tx.contact as { first_name?: string; last_name?: string } | null;
      const invoice = tx.invoice as { invoice_number?: string } | null;
      const category = tx.category as { label?: string } | null;
      const contactName = contact
        ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
        : "";
      return [
        tx.transaction_date,
        tx.type,
        tx.status,
        tx.amount,
        tx.currency,
        tx.description ?? "",
        category?.label ?? "",
        contactName,
        invoice?.invoice_number ?? "",
        tx.payment_method ?? "",
        tx.vendor_name ?? "",
      ];
    });

    const csv = toCsv(
      [
        "transaction_date",
        "type",
        "status",
        "amount",
        "currency",
        "description",
        "category",
        "contact_name",
        "invoice_number",
        "payment_method",
        "vendor_name",
      ],
      rows
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    });
  } catch (err) {
    console.error("GET /api/finances/transactions/export:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
