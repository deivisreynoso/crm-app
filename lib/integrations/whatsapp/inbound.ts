import { z } from "zod";

const inboundSchema = z.object({
  from: z.string().min(8),
  body: z.string().optional(),
  message_id: z.string().optional(),
});

export type WhatsAppInboundMessage = z.infer<typeof inboundSchema>;

/** Normalize Meta webhook payload into CRM routing input. */
export function routeInboundWhatsApp(body: unknown): WhatsAppInboundMessage | null {
  const parsed = inboundSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}
