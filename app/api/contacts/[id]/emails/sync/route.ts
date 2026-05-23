import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { syncContactEmailsFromGmail } from "@/lib/google/gmail-sync";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const { id: contactId } = await context.params;
    const supabase = createServerSideClient();

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, email")
      .eq("id", contactId)
      .eq("user_id", userId!)
      .maybeSingle();

    if (contactError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (!contact.email?.trim()) {
      return NextResponse.json(
        { error: "Contact has no email address to sync." },
        { status: 400 }
      );
    }

    const result = await syncContactEmailsFromGmail(
      userId!,
      contactId,
      contact.email
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
    console.error("POST /api/contacts/[id]/emails/sync:", err);
    return NextResponse.json({ error: "Failed to sync emails" }, { status: 500 });
  }
}
