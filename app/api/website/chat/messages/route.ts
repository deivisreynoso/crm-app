import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import { getWebchatHumanMessagesForSession } from "@/lib/conversations/webchat-poll";
import { createServerSideClient } from "@/lib/supabase";
import {
  pollSecretFromQualification,
  verifyWebchatPollSecret,
} from "@/lib/website/webchat-poll-auth";

const querySchema = z.object({
  session_id: z.string().min(1),
  session_secret: z.string().min(16),
});

const emptyPollResponse = { handler: "ai" as const, messages: [] as [] };

/** Public poll for webchat widget — human agent replies during CRM takeover. */
export async function GET(req: NextRequest) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = checkRateLimit(`webchat-poll:${ip}`, 120, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: limit.retryAfterSec
            ? { "Retry-After": String(limit.retryAfterSec) }
            : undefined,
        }
      );
    }

    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(emptyPollResponse);
    }

    const workspaceOwnerId = process.env.WEBSITE_LEADS_USER_ID?.trim();
    if (!workspaceOwnerId) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const after = new URL(req.url).searchParams.get("after");
    const supabase = createServerSideClient();

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, handler, qualification")
      .eq("user_id", workspaceOwnerId)
      .eq("channel", "webchat")
      .eq("external_session_id", parsed.data.session_id)
      .maybeSingle();

    if (!conversation?.id) {
      return NextResponse.json(emptyPollResponse);
    }

    const storedHash = pollSecretFromQualification(
      conversation.qualification as Record<string, unknown>
    );
    if (!verifyWebchatPollSecret(parsed.data.session_secret, storedHash)) {
      return NextResponse.json(emptyPollResponse);
    }

    const messages = await getWebchatHumanMessagesForSession(
      supabase,
      workspaceOwnerId,
      parsed.data.session_id,
      after
    );

    return NextResponse.json({
      handler: (conversation.handler as string) ?? "ai",
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
