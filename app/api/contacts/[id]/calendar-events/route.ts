import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { requireN8nInternalAuth } from "@/lib/integrations/n8n-internal-auth";

type RouteContext = { params: Promise<{ id: string }> };

/** N8N: check if contact already booked a customer_meeting (onboarding Step 2). */
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireN8nInternalAuth(req);
  if (!auth.ok) return auth.error;

  try {
    const { id: contactId } = await context.params;
    const kind = new URL(req.url).searchParams.get("kind") ?? "customer_meeting";

    const supabase = createServerSideClient();
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, event_kind")
      .eq("user_id", auth.workspaceOwnerId)
      .eq("contact_id", contactId)
      .eq("event_kind", kind)
      .order("start_time", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], count: data?.length ?? 0 });
  } catch (err) {
    console.error("GET /api/contacts/[id]/calendar-events:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
