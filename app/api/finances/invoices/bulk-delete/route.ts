import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceOwner } from "@/lib/api/auth";
import { recordAuditLog } from "@/lib/audit/record";
import { ownerDeleteInvoice } from "@/lib/finances/delete-invoice";
import { createServerSideClient } from "@/lib/supabase";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceOwnerId, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const ownerError = requireWorkspaceOwner(isWorkspaceOwner);
    if (ownerError) return ownerError;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const deleted: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of parsed.data.ids) {
      const { data: existing } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("id", id)
        .eq("user_id", workspaceOwnerId!)
        .maybeSingle();

      try {
        await ownerDeleteInvoice(supabase, workspaceOwnerId!, id);
        deleted.push(id);
        await recordAuditLog({
          workspaceOwnerId: workspaceOwnerId!,
          actorUserId: userId!,
          action: "invoice.deleted",
          entityType: "invoice",
          entityId: id,
          entityName: (existing?.invoice_number as string) ?? id,
          changeSummary: `Permanently deleted invoice ${existing?.invoice_number ?? id}`,
          req,
        });
      } catch (err) {
        failed.push({
          id,
          error: err instanceof Error ? err.message : "Delete failed",
        });
      }
    }

    return NextResponse.json({ deleted, failed });
  } catch (err) {
    console.error("POST /api/finances/invoices/bulk-delete:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
