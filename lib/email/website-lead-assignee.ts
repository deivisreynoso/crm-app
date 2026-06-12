import type { CrmLocale } from "@/lib/crm/i18n";
import { getSiteBaseUrl } from "@/lib/website/site-url";

export function websiteLeadAssigneeEmail(input: {
  assigneeName: string;
  leadName: string;
  leadEmail: string;
  source: "form" | "webchat";
  contactId: string;
  hasAppointment: boolean;
  returningVisitor: boolean;
}): { subject: string; html: string; text: string } {
  const contactUrl = `${getSiteBaseUrl()}/contacts/${input.contactId}`;
  const sourceLabel =
    input.source === "form" ? "website form" : "AI webchat conversation";
  const title = input.returningVisitor ? "Returning website lead" : "New website lead";

  const text = `Hi ${input.assigneeName},

${title} from ${sourceLabel}:

${input.leadName}
${input.leadEmail}
${input.hasAppointment ? "Includes a booked discovery call." : "No appointment selected yet."}

Open in CRM: ${contactUrl}

— ClickIn 360`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem;margin:0 auto;padding:1.5rem">
  <p style="font-weight:600;font-size:1.125rem;margin:0 0 1rem">ClickIn 360</p>
  <p>Hi ${input.assigneeName},</p>
  <p><strong>${title}</strong> from ${sourceLabel}:</p>
  <p><strong>${input.leadName}</strong><br/>${input.leadEmail}</p>
  <p>${input.hasAppointment ? "Includes a booked discovery call." : "No appointment selected yet."}</p>
  <p><a href="${contactUrl}">Open contact in CRM</a></p>
  <p style="margin-top:2rem;font-size:0.75rem;color:#666">ClickIn 360 LLC</p>
</body></html>`;

  return {
    subject: `${title}: ${input.leadName}`,
    html,
    text,
  };
}
