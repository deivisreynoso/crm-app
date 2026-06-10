import { NextRequest, NextResponse } from "next/server";
import { verifyN8NWebhookSecret } from "@/lib/integrations/n8n/auth";
import { validateN8NInboundPayload } from "@/lib/integrations/n8n/events";

/** Inbound N8N workflow callbacks (configure secret via N8N_WEBHOOK_SECRET). */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-n8n-secret");
  if (!verifyN8NWebhookSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = validateN8NInboundPayload(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  return NextResponse.json({
    received: true,
    event: parsed.data.event,
    status: "queued",
  });
}
