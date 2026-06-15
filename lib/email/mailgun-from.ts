import { CLICKIN360_BRAND } from "@/lib/brand";
import { getMailgunFrom } from "@/lib/email/mailgun-config";

/** Ensures transactional Mailgun sends display as "ClickIn 360 <address>". */
export function resolveMailgunFromAddress(): string {
  const configured = getMailgunFrom();
  if (!configured) {
    return `${CLICKIN360_BRAND} <no-reply@mail.clickin360.com>`;
  }
  if (configured.includes("<") && configured.includes(">")) {
    return configured;
  }
  return `${CLICKIN360_BRAND} <${configured}>`;
}
