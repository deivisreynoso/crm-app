import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSideClient } from "@/lib/supabase";
import { requireN8nInternalAuth } from "@/lib/integrations/n8n-internal-auth";
import { closeWonOpportunityForInvoice } from "@/lib/opportunities/close-won";

const bodySchema = z.object({
  contact_id: z.string().uuid(),
  document_id: z.string().uuid(),
  invoice_total: z.number().nonnegative(),
});

export async function PATCH(req: NextRequest) {
  const auth = requireN8nInternalAuth(req);
  if (!auth.ok) return auth.error;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const result = await closeWonOpportunityForInvoice(
      supabase,
      auth.workspaceOwnerId,
      parsed.data
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason });
    }

    return NextResponse.json({
      ok: true,
      opportunity_id: result.opportunity_id,
      already_won: result.already_won,
    });
  } catch (err) {
    console.error("PATCH /api/opportunities/close-won:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
