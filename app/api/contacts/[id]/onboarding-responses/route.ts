import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api/auth";
import { verifyContactInWorkspace } from "@/lib/contacts/verify-contact-ownership";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id: contactId } = await context.params;
    const supabase = createServerSideClient();

    const owned = await verifyContactInWorkspace(workspaceOwnerId!, contactId, supabase);
    if (!owned) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("onboarding_responses")
      .select("*")
      .eq("contact_id", contactId)
      .order("submitted_at", { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/contacts/[id]/onboarding-responses:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
