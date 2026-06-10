import type { WhatsAppOutboundMessage, WhatsAppProvider } from "@/lib/integrations/whatsapp";

class MetaWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(message: WhatsAppOutboundMessage) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    if (!phoneNumberId || !token) {
      throw new Error("WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN).");
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.to.replace(/\D/g, ""),
          type: "text",
          text: { body: message.body },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`WhatsApp send failed: ${await res.text()}`);
    }

    const data = (await res.json()) as { messages?: { id: string }[] };
    return { messageId: data.messages?.[0]?.id ?? "unknown" };
  }
}

export function createWhatsAppProvider(): WhatsAppProvider {
  return new MetaWhatsAppProvider();
}
