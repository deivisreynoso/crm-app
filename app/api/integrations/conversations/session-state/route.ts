import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireConversationIntegrationAuth } from "@/lib/integrations/conversations/auth";
import { getConversationSessionState } from "@/lib/conversations/session-state";
import { createServerSideClient } from "@/lib/supabase";

const bodySchema = z.object({
  session_id: z.string().min(1),
  channel: z.enum(["whatsapp", "webchat"]),
  phone_number: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const auth = requireConversationIntegrationAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const state = await getConversationSessionState(
      supabase,
      auth.workspaceOwnerId,
      {
        session_id: parsed.data.session_id,
        channel: parsed.data.channel,
      }
    );

    return NextResponse.json(state);
  } catch (err) {
    console.error("POST /api/integrations/conversations/session-state:", err);
    return NextResponse.json(
      { error: "Failed to load session state" },
      { status: 500 }
    );
  }
}
