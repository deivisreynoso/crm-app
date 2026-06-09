import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { syncContactEmailsFromGmail } from "@/lib/google/gmail-sync";
import { loadTicketEmailContext } from "@/lib/tickets/ticket-email-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id: ticketId } = await context.params;
    const supabase = createServerSideClient();
    const ctx = await loadTicketEmailContext(supabase, workspaceOwnerId!, ticketId);

    if (!ctx) {
      return NextResponse.json({ error: "Service ticket not found" }, { status: 404 });
    }

    if (!ctx.contact) {
      return NextResponse.json(
        { error: "Link a contact to this ticket before syncing email." },
        { status: 400 }
      );
    }

    if (!ctx.contact.email?.trim()) {
      return NextResponse.json(
        { error: "The linked contact has no email address to sync." },
        { status: 400 }
      );
    }

    const contactName =
      [ctx.contact.first_name, ctx.contact.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || ctx.contact.email;

    const result = await syncContactEmailsFromGmail(
      userId!,
      workspaceOwnerId!,
      ctx.contact.id,
      ctx.contact.email,
      contactName
    );

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          synced: result.synced,
          needs_reauth: result.needs_reauth ?? false,
        },
        { status: result.synced > 0 ? 200 : 403 }
      );
    }

    return NextResponse.json({
      synced: result.synced,
      listed: result.listed,
      contact_email: result.contact_email,
      hint: result.hint,
    });
  } catch (err) {
    console.error("POST /api/tickets/[id]/emails/sync:", err);
    return NextResponse.json({ error: "Failed to sync emails" }, { status: 500 });
  }
}
