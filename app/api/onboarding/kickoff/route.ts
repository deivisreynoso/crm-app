import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSideClient } from "@/lib/supabase";
import { requireN8nInternalAuth } from "@/lib/integrations/n8n-internal-auth";
import { kickoffOnboardingFromInvoice } from "@/lib/onboarding/kickoff-from-invoice";

const bodySchema = z.object({
  contact_id: z.string().uuid(),
  document_id: z.string().uuid().optional().nullable(),
  invoice_total: z.number().nonnegative(),
});

/**
 * N8N → CRM: close won, activate contact, onboarding tasks, in-app notify.
 * POST /api/onboarding/kickoff
 */
export async function POST(req: NextRequest) {
  const auth = requireN8nInternalAuth(req);
  if (!auth.ok) return auth.error;

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const result = await kickoffOnboardingFromInvoice(
      supabase,
      auth.workspaceOwnerId,
      {
        contact_id: parsed.data.contact_id,
        document_id: parsed.data.document_id ?? null,
        invoice_total: parsed.data.invoice_total,
      }
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/onboarding/kickoff:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
