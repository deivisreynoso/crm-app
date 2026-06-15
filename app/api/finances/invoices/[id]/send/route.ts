import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  to: z.string().email().optional(),
  subject: z.string().max(200).optional(),
  body: z.string().max(10000).optional(),
});

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: invoice } = await supabase
      .from("invoices")
      .select("*, contact:contacts(id, first_name, last_name, email)")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.status === "voided" || invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice cannot be sent in this status." }, { status: 400 });
    }

    const contact = invoice.contact as { email?: string | null } | null;
    const to = parsed.data.to ?? contact?.email;
    if (!to) {
      return NextResponse.json({ error: "Recipient email is required." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error: dbError } = await supabase
      .from("invoices")
      .update({ status: "sent", sent_at: now, updated_at: now })
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({
      data,
      email: {
        to,
        subject: parsed.data.subject ?? `Invoice ${invoice.invoice_number}`,
        body: parsed.data.body ?? `Please find your invoice ${invoice.invoice_number} attached.`,
        note: "Use Gmail integration or email composer to deliver the PDF.",
      },
    });
  } catch (err) {
    console.error("POST invoice send:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
