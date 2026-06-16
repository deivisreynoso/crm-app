import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { requireN8nInternalAuth } from "@/lib/integrations/n8n-internal-auth";
import { logContactActivity } from "@/lib/activities/log-contact-activity";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = requireN8nInternalAuth(req);
  if (!auth.ok) return auth.error;

  try {
    const { id } = await context.params;
    const supabase = createServerSideClient();
    const now = new Date().toISOString();

    const { data: row } = await supabase
      .from("project_feedback")
      .select("id, contact_id, contacts!inner(user_id)")
      .eq("id", id)
      .maybeSingle();

    const contactUserId = (
      row?.contacts as { user_id?: string } | null | undefined
    )?.user_id;

    if (!row || contactUserId !== auth.workspaceOwnerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("project_feedback")
      .update({
        google_review_sent: true,
        google_review_sent_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logContactActivity(supabase, {
      userId: auth.workspaceOwnerId,
      contactId: row.contact_id as string,
      type: "system",
      description: "Google review invitation sent",
      metadata: { project_feedback_id: id },
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH /api/project-feedback/[id]/google-review-sent:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
