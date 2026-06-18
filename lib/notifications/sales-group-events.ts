import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emailSalesGroup,
  notifySalesGroupInApp,
} from "@/lib/notifications/workspace-groups";
import { getSiteBaseUrl } from "@/lib/website/site-url";

export type WebsiteLeadSource = "form" | "webchat" | "whatsapp";

export type SalesLeadAlertReason = "appointment" | "human_review";

function channelLabel(source: WebsiteLeadSource): string {
  if (source === "form") return "website form";
  if (source === "whatsapp") return "WhatsApp conversation";
  return "AI webchat conversation";
}

function alertCopy(input: {
  reason: SalesLeadAlertReason;
  source: WebsiteLeadSource;
  leadName: string;
  returningVisitor: boolean;
}) {
  if (input.reason === "human_review") {
    const title =
      input.source === "whatsapp"
        ? "WhatsApp chat needs a human"
        : "Webchat needs a human";
    return {
      title,
      subject: `${title}: ${input.leadName}`,
      detail: `A visitor requested a team member during an ${channelLabel(input.source)}.`,
    };
  }

  const title = input.returningVisitor
    ? "Discovery call booked (returning lead)"
    : "Discovery call booked";
  return {
    title,
    subject: `${title}: ${input.leadName}`,
    detail: `Includes a booked discovery call from ${channelLabel(input.source)}.`,
  };
}

/** Email + in-app alert to the sales group — appointment booked or human requested only. */
export async function notifySalesGroupLeadAlert(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    contactId: string;
    leadName: string;
    leadEmail: string;
    source: WebsiteLeadSource;
    reason: SalesLeadAlertReason;
    returningVisitor?: boolean;
    conversationId?: string;
  }
): Promise<void> {
  const copy = alertCopy({
    reason: input.reason,
    source: input.source,
    leadName: input.leadName,
    returningVisitor: input.returningVisitor ?? false,
  });

  const related =
    input.reason === "human_review" && input.conversationId
      ? {
          related_entity_type: "conversation" as const,
          related_entity_id: input.conversationId,
        }
      : {
          related_entity_type: "contact" as const,
          related_entity_id: input.contactId,
        };

  await notifySalesGroupInApp(supabase, input.workspaceOwnerId, {
    kind: "sales_website_lead",
    title: copy.title,
    message: input.leadName,
    ...related,
  });

  const contactUrl = `${getSiteBaseUrl()}/contacts/${input.contactId}`;
  const conversationUrl =
    input.conversationId != null
      ? `${getSiteBaseUrl()}/conversations?conversation=${input.conversationId}`
      : null;

  const cta =
    input.reason === "human_review" && conversationUrl
      ? { label: "Open conversation", href: conversationUrl }
      : { label: "Open contact in CRM", href: contactUrl };

  const text = `${copy.subject}

${input.leadName}
${input.leadEmail}

${copy.detail}

Open in CRM: ${cta.href}`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem;margin:0 auto;padding:1.5rem">
  <p style="font-weight:600;font-size:1.125rem;margin:0 0 1rem">ClickIn 360</p>
  <p><strong>${copy.title}</strong></p>
  <p>${copy.detail}</p>
  <p><strong>${input.leadName}</strong><br/>${input.leadEmail}</p>
  <p><a href="${cta.href}" style="display:inline-block;padding:0.5rem 1rem;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:6px">${cta.label}</a></p>
  <p style="margin-top:2rem;font-size:0.75rem;color:#666">ClickIn 360 LLC</p>
</body></html>`;

  await emailSalesGroup(supabase, input.workspaceOwnerId, copy.subject, html, text);
}

/** @deprecated Use notifySalesGroupLeadAlert with reason appointment | human_review */
export async function notifySalesGroupWebsiteLead(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    contactId: string;
    leadName: string;
    leadEmail: string;
    source: "form" | "webchat";
    hasAppointment: boolean;
    returningVisitor: boolean;
  }
): Promise<void> {
  if (!input.hasAppointment) return;
  await notifySalesGroupLeadAlert(supabase, {
    workspaceOwnerId: input.workspaceOwnerId,
    contactId: input.contactId,
    leadName: input.leadName,
    leadEmail: input.leadEmail,
    source: input.source,
    reason: "appointment",
    returningVisitor: input.returningVisitor,
  });
}
