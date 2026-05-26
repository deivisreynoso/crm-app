import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { loadTicketEmailContext } from "@/lib/tickets/ticket-email-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id: ticketId } = await context.params;
    const supabase = createServerSideClient();
    const ctx = await loadTicketEmailContext(supabase, workspaceOwnerId!, ticketId);

    if (!ctx) {
      return NextResponse.json({ error: "Service ticket not found" }, { status: 404 });
    }

    if (!ctx.contact) {
      return NextResponse.json({
        data: [],
        hint: "Link a contact with an email address to use email on this ticket.",
      });
    }

    const { data, error: dbError } = await supabase
      .from("contact_emails")
      .select(
        "id, direction, gmail_message_id, gmail_thread_id, from_email, to_email, subject, body, sent_at, ticket_id"
      )
      .eq("user_id", workspaceOwnerId!)
      .eq("contact_id", ctx.contact.id)
      .or(`ticket_id.is.null,ticket_id.eq.${ticketId}`)
      .order("sent_at", { ascending: true });

    if (dbError) {
      const needsMigration = /does not exist|relation|ticket_id/i.test(dbError.message);
      return NextResponse.json(
        {
          error: needsMigration
            ? "Run migrations 019_contact_emails.sql and 030_ticket_emails.sql in Supabase."
            : dbError.message,
          data: [],
        },
        { status: needsMigration ? 503 : 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/tickets/[id]/emails:", err);
    return NextResponse.json({ error: "Failed to load emails" }, { status: 500 });
  }
}
