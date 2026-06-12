import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { duplicateInvoice } from "@/lib/finances/invoices";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    try {
      const data = await duplicateInvoice(supabase, workspaceOwnerId!, id);
      return NextResponse.json({ data }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Duplicate failed";
      if (message === "Invoice not found") {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      return NextResponse.json({ error: humanizeDbError(message) }, { status: 500 });
    }
  } catch (err) {
    console.error("POST invoice duplicate:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
