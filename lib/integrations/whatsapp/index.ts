export type WhatsAppOutboundMessage = {
  to: string;
  body: string;
  templateName?: string;
};

export type WhatsAppProvider = {
  sendMessage(message: WhatsAppOutboundMessage): Promise<{ messageId: string }>;
};

export { createWhatsAppProvider } from "@/lib/integrations/whatsapp/provider";
export { routeInboundWhatsApp } from "@/lib/integrations/whatsapp/inbound";
