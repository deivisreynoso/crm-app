import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { ticketPatchSchema } from "@/lib/validators";
import { buildTicketUpdate } from "@/lib/ticket-payload";
import { enrichTicket } from "@/lib/ticket-queries";
import {
  assertParentsInWorkspace,
  workspaceParentForbidden,
} from "@/lib/api/assert-workspace-parents";
import { enrichCompanyIdFromContact } from "@/lib/contacts/enrich-company-from-contact";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";
import { ticketDisplayLabel } from "@/lib/service-ticket-number";
import { createNotification } from "@/lib/notifications/create-notification";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Service ticket not found" }, { status: 404 });
    }

    return NextResponse.json(await enrichTicket(data));
  } catch (err) {
    console.error("GET /api/tickets/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = ticketPatchSchema.safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        {
          error: detailStr || "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const parentCheck = await assertParentsInWorkspace(supabase, workspaceOwnerId!, {
      contact_id: parsed.data.contact_id,
      company_id: parsed.data.company_id,
    });
    const parentError = workspaceParentForbidden(parentCheck);
    if (parentError) return parentError;

    let patch = parsed.data;
    if (parsed.data.contact_id?.trim()) {
      const companyId = await enrichCompanyIdFromContact(
        supabase,
        workspaceOwnerId!,
        parsed.data.contact_id,
        parsed.data.company_id
      );
      patch = { ...parsed.data, company_id: companyId ?? undefined };
    }

    const { data, error: dbError } = await supabase
      .from("tickets")
      .update({ ...buildTicketUpdate(patch), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select("*")
      .single();

    if (dbError) {
      const status = /duplicate|unique/i.test(dbError.message) ? 409 : 500;
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status }
      );
    }

    if (parsed.data.status) {
      const label = ticketDisplayLabel(data);
      await createNotification(supabase, userId!, {
        kind: "ticket_update",
        title: "Ticket status updated",
        message: `${data.ticket_number ? `${data.ticket_number}: ` : ""}${label} — ${parsed.data.status.replace("_", " ")}`,
        related_entity_type: "ticket",
        related_entity_id: id,
      });
    }

    return NextResponse.json(await enrichTicket(data));
  } catch (err) {
    console.error("PATCH /api/tickets/[id] error:", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("tickets")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tickets/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
}
