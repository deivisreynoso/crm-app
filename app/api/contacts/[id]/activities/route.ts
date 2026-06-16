import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSideClient } from "@/lib/supabase";
import { requireN8nInternalAuth } from "@/lib/integrations/n8n-internal-auth";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import type { ContactActivityType } from "@/lib/activities/log-contact-activity";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  body: z.string().min(1).max(5000),
  type: z
    .enum([
      "email",
      "call",
      "meeting",
      "task",
      "note",
      "system",
      "update",
      "created",
      "review_request",
      "project_feedback",
      "onboarding",
    ])
    .optional(),
});

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = requireN8nInternalAuth(req);
  if (!auth.ok) return auth.error;

  try {
    const { id: contactId } = await context.params;
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, user_id")
      .eq("id", contactId)
      .eq("user_id", auth.workspaceOwnerId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const activityType = (parsed.data.type ?? "system") as ContactActivityType;

    await logContactActivity(supabase, {
      userId: auth.workspaceOwnerId,
      contactId,
      type: activityType,
      description: parsed.data.body,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/contacts/[id]/activities:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
