import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getConversationSessionState } from "@/lib/conversations/session-state";
import { getWebchatHumanMessagesForSession } from "@/lib/conversations/webchat-poll";
import { createServerSideClient } from "@/lib/supabase";

const querySchema = z.object({
  session_id: z.string().min(1),
});

/** Public poll for webchat widget — human agent replies during CRM takeover. */
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workspaceOwnerId = process.env.WEBSITE_LEADS_USER_ID?.trim();
    if (!workspaceOwnerId) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const after = new URL(req.url).searchParams.get("after");
    const supabase = createServerSideClient();

    const [state, messages] = await Promise.all([
      getConversationSessionState(supabase, workspaceOwnerId, {
        session_id: parsed.data.session_id,
        channel: "webchat",
      }),
      getWebchatHumanMessagesForSession(
        supabase,
        workspaceOwnerId,
        parsed.data.session_id,
        after
      ),
    ]);

    return NextResponse.json({
      handler: state.handler,
      conversation_id: state.conversation_id,
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        created_at: m.created_at,
      })),
    });
  } catch (err) {
    console.error("GET /api/website/chat/messages:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
