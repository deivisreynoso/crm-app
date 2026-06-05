import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { verifyContactInWorkspace } from "@/lib/contacts/verify-contact-ownership";
import { createServerSideClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id: contactId } = await context.params;
    if (!(await verifyContactInWorkspace(workspaceOwnerId!, contactId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const supabase = createServerSideClient();

    const { data, error: dbError } = await supabase
      .from("contact_emails")
      .select(
        "id, direction, gmail_message_id, gmail_thread_id, from_email, to_email, subject, body, sent_at"
      )
      .eq("user_id", workspaceOwnerId!)
      .eq("contact_id", contactId)
      .order("sent_at", { ascending: true });

    if (dbError) {
      const needsMigration = /does not exist|relation/i.test(dbError.message);
      return NextResponse.json(
        {
          error: needsMigration
            ? "Run migration 019_contact_emails.sql in Supabase."
            : dbError.message,
          data: [],
        },
        { status: needsMigration ? 503 : 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/contacts/[id]/emails:", err);
    return NextResponse.json({ error: "Failed to load emails" }, { status: 500 });
  }
}
