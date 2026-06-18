import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import { getClickIn360OrgUserIdOptional } from "@/lib/org/constants";
import { registerWebchatPollSecret } from "@/lib/website/webchat-poll-auth";

const DEFAULT_WEBHOOK = "https://n8n.clickin360.com/webhook/webchat";

const bodySchema = z.object({
  session_id: z.string().min(1),
  session_secret: z.string().min(16).optional(),
  message: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

/** Same-origin proxy for the marketing chat widget → N8N (avoids browser CORS). */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = checkRateLimit(`webchat-send:${ip}`, 60, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: limit.retryAfterSec
            ? { "Retry-After": String(limit.retryAfterSec) }
            : undefined,
        }
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workspaceOwnerId = getClickIn360OrgUserIdOptional();
    if (workspaceOwnerId && parsed.data.session_secret) {
      registerWebchatPollSecret(
        workspaceOwnerId,
        parsed.data.session_id,
        parsed.data.session_secret
      );
    }

    const webhookUrl =
      process.env.N8N_WEBCHAT_WEBHOOK_URL?.trim() ||
      process.env.NEXT_PUBLIC_N8N_WEBCHAT_WEBHOOK_URL?.trim() ||
      DEFAULT_WEBHOOK;

    const payload = {
      session_id: parsed.data.session_id,
      message: parsed.data.message,
      ...(parsed.data.name?.trim() ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.email?.trim() ? { email: parsed.data.email.trim() } : {}),
    };

    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    let data: unknown = text;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Chat service unavailable",
          upstream_status: upstream.status,
          detail: typeof data === "string" ? data : data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply: data });
  } catch (err) {
    console.error("POST /api/website/chat:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat request failed" },
      { status: 500 }
    );
  }
}
