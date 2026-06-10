import { z } from "zod";

export const N8N_EVENT_TYPES = [
  "contact.created",
  "contact.updated",
  "opportunity.created",
  "website.lead",
  "email.sent",
  "document.sent",
  "quote.accepted",
  "quote.rejected",
] as const;

export type N8NEventType = (typeof N8N_EVENT_TYPES)[number];

const inboundSchema = z.object({
  event: z.string().min(1),
  workspace_owner_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export function validateN8NInboundPayload(body: unknown) {
  return inboundSchema.safeParse(body);
}
