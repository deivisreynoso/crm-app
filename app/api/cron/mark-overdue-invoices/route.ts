import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { markOverdueInvoices } from "@/lib/finances/invoices";
import { notifyInvoiceOverdue } from "@/lib/finances/finance-notifications";
import { logContactActivity } from "@/lib/activities/log-contact-activity";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerSideClient();
    const { data: owners, error: ownersError } = await supabase
      .from("user_settings")
      .select("user_id");

    if (ownersError) {
      return NextResponse.json({ error: ownersError.message }, { status: 500 });
    }

    let marked = 0;
    for (const row of owners ?? []) {
      const ownerId = row.user_id as string;
      const newlyOverdue = await markOverdueInvoices(supabase, ownerId);
      marked += newlyOverdue.length;
      for (const inv of newlyOverdue) {
        await notifyInvoiceOverdue(supabase, ownerId, inv.id, inv.invoice_number);
        const { data: invoice } = await supabase
          .from("invoices")
          .select("contact_id")
          .eq("id", inv.id)
          .maybeSingle();
        if (invoice?.contact_id) {
          await logContactActivity(supabase, {
            userId: ownerId,
            contactId: invoice.contact_id as string,
            type: "system",
            description: `Invoice ${inv.invoice_number} marked overdue`,
            metadata: { invoice_id: inv.id },
          });
        }
      }
    }

    return NextResponse.json({ ok: true, marked });
  } catch (err) {
    console.error("GET /api/cron/mark-overdue-invoices:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
