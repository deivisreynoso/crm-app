export const OUTBOUND_WEBHOOK_EVENTS = [
  "quote.accepted",
  "invoice.paid",
  "onboarding.manual_start",
  "questionnaire.submitted",
  "onboarding.complete",
  "appointment.created",
  "appointment.updated",
  "appointment.cancelled",
  "project.stage_changed",
  "project.completed",
  "project.feedback_received",
] as const;

export type OutboundWebhookEvent = (typeof OUTBOUND_WEBHOOK_EVENTS)[number];

export function isOutboundWebhookEvent(value: string): value is OutboundWebhookEvent {
  return (OUTBOUND_WEBHOOK_EVENTS as readonly string[]).includes(value);
}
