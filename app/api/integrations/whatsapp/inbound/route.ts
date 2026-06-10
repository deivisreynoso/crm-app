import { NextRequest, NextResponse } from "next/server";
import { routeInboundWhatsApp } from "@/lib/integrations/whatsapp/inbound";
import { triggerN8NWebhook } from "@/lib/n8n";

/** Meta WhatsApp webhook ingress — forwards normalized payload to N8N. */
export async function POST(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const body = await req.json().catch(() => null);

  const message = routeInboundWhatsApp(body);
  if (!message) {
    return NextResponse.json({ error: "Unsupported payload" }, { status: 400 });
  }

  void triggerN8NWebhook("whatsapp.inbound", message);

  return NextResponse.json({ ok: true, verify_token_configured: Boolean(verifyToken) });
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && token && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
