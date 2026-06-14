import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { isTransactionalEmailConfigured } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/create-notification";
import { getSiteBaseUrl } from "@/lib/website/site-url";

const DEFAULT_SALES_GROUP_EMAIL = "sales@clickin360.com";
const DEFAULT_SUPPORT_GROUP_EMAIL = "support@clickin360.com";

export type WorkspaceGroupEmails = {
  sales: string;
  support: string;
};

export async function getWorkspaceGroupEmails(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<WorkspaceGroupEmails> {
  const { data } = await supabase
    .from("user_settings")
    .select("sales_group_email, support_group_email")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  return {
    sales:
      (data?.sales_group_email as string | null)?.trim() || DEFAULT_SALES_GROUP_EMAIL,
    support:
      (data?.support_group_email as string | null)?.trim() ||
      DEFAULT_SUPPORT_GROUP_EMAIL,
  };
}

async function sendWorkspaceGroupEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  if (!to || !isTransactionalEmailConfigured()) return;
  try {
    await sendEmail({ to, subject, html, text });
  } catch (err) {
    console.error("sendWorkspaceGroupEmail:", err);
  }
}

export async function listSalesGroupMemberIds(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<string[]> {
  const ids = new Set<string>([workspaceOwnerId]);

  const { data: members } = await supabase
    .from("team_members")
    .select("member_user_id, role")
    .eq("owner_user_id", workspaceOwnerId);

  for (const row of members ?? []) {
    const role = row.role as string;
    if (role === "sales" || role === "admin") {
      ids.add(row.member_user_id as string);
    }
  }

  return [...ids];
}

export async function listSupportGroupMemberIds(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<string[]> {
  const ids = new Set<string>([workspaceOwnerId]);

  const { data: members } = await supabase
    .from("team_members")
    .select("member_user_id, role")
    .eq("owner_user_id", workspaceOwnerId);

  for (const row of members ?? []) {
    if ((row.role as string) === "admin") {
      ids.add(row.member_user_id as string);
    }
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("support_widget_assignee")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  const assignee = settings?.support_widget_assignee as string | null;
  if (assignee) ids.add(assignee);

  return [...ids];
}

export async function notifySalesGroupInApp(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: {
    kind:
      | "sales_website_lead"
      | "sales_invoice_paid"
      | "sales_quote_accepted"
      | "sales_quote_declined";
    title: string;
    message?: string;
    related_entity_type?: string;
    related_entity_id?: string;
  }
): Promise<void> {
  const memberIds = await listSalesGroupMemberIds(supabase, workspaceOwnerId);
  await Promise.all(
    memberIds.map((userId) =>
      createNotification(supabase, userId, {
        kind: input.kind,
        title: input.title,
        message: input.message,
        related_entity_type: input.related_entity_type,
        related_entity_id: input.related_entity_id,
      })
    )
  );
}

export async function notifySupportGroupInApp(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  input: {
    title: string;
    message?: string;
    related_entity_type?: string;
    related_entity_id?: string;
  }
): Promise<void> {
  const memberIds = await listSupportGroupMemberIds(supabase, workspaceOwnerId);
  await Promise.all(
    memberIds.map((userId) =>
      createNotification(supabase, userId, {
        kind: "support_ticket_received",
        title: input.title,
        message: input.message,
        related_entity_type: input.related_entity_type,
        related_entity_id: input.related_entity_id,
      })
    )
  );
}

export async function emailSalesGroup(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const { sales } = await getWorkspaceGroupEmails(supabase, workspaceOwnerId);
  await sendWorkspaceGroupEmail(sales, subject, html, text);
}

export async function emailSupportGroup(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const { support } = await getWorkspaceGroupEmails(supabase, workspaceOwnerId);
  await sendWorkspaceGroupEmail(support, subject, html, text);
}

function groupEmailShell(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  const ctaBlock = cta
    ? `<p><a href="${cta.href}" style="display:inline-block;padding:0.5rem 1rem;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:6px">${cta.label}</a></p>`
    : "";
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem;margin:0 auto;padding:1.5rem">
  <p style="font-weight:600;font-size:1.125rem;margin:0 0 1rem">ClickIn 360</p>
  <p><strong>${title}</strong></p>
  ${bodyHtml}
  ${ctaBlock}
  <p style="margin-top:2rem;font-size:0.75rem;color:#666">ClickIn 360 LLC</p>
</body></html>`;
}

export function salesWebsiteLeadGroupEmail(input: {
  leadName: string;
  leadEmail: string;
  source: "form" | "webchat";
  contactId: string;
  hasAppointment: boolean;
  returningVisitor: boolean;
}) {
  const contactUrl = `${getSiteBaseUrl()}/contacts/${input.contactId}`;
  const title = input.returningVisitor ? "Returning website lead" : "New website lead";
  const sourceLabel =
    input.source === "form" ? "website form" : "AI webchat conversation";
  const text = `${title} from ${sourceLabel}

${input.leadName}
${input.leadEmail}
${input.hasAppointment ? "Includes a booked discovery call." : "No appointment selected yet."}

Open in CRM: ${contactUrl}`;

  const html = groupEmailShell(
    title,
    `<p>From ${sourceLabel}:</p>
     <p><strong>${input.leadName}</strong><br/>${input.leadEmail}</p>
     <p>${input.hasAppointment ? "Includes a booked discovery call." : "No appointment selected yet."}</p>`,
    { label: "Open contact in CRM", href: contactUrl }
  );

  return { subject: `${title}: ${input.leadName}`, html, text };
}

export function salesInvoicePaidGroupEmail(input: {
  invoiceNumber: string;
  amount: number;
  currency: string;
  invoiceId: string;
}) {
  const url = `${getSiteBaseUrl()}/finances/invoices/${input.invoiceId}`;
  const amountLabel = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: input.currency,
  }).format(input.amount);
  const subject = `Invoice ${input.invoiceNumber} paid via payment link`;
  const text = `Payment received: ${amountLabel} on invoice ${input.invoiceNumber}.\n\nView invoice: ${url}`;
  const html = groupEmailShell(
    subject,
    `<p>Payment received: <strong>${amountLabel}</strong></p>`,
    { label: "View invoice", href: url }
  );
  return { subject, html, text };
}

export function salesQuoteResponseGroupEmail(input: {
  quoteReference: string;
  action: "accepted" | "declined";
  responseName?: string | null;
  responseEmail?: string | null;
  documentId: string;
}) {
  const verb = input.action === "accepted" ? "accepted" : "declined";
  const subject = `Quote ${input.quoteReference} ${verb}`;
  const who = input.responseName
    ? ` by ${input.responseName}${input.responseEmail ? ` (${input.responseEmail})` : ""}`
    : "";
  const url = `${getSiteBaseUrl()}/documents/${input.documentId}`;
  const text = `Quote ${input.quoteReference} was ${verb}${who}.\n\nOpen quote: ${url}`;
  const html = groupEmailShell(
    subject,
    `<p>Customer response${who}.</p>`,
    { label: "Open quote", href: url }
  );
  return { subject, html, text };
}

export function supportTicketGroupEmail(input: {
  ticketNumber: string;
  subject: string;
  priority: string;
  source: string;
  ticketId: string;
}) {
  const url = `${getSiteBaseUrl()}/tickets/${input.ticketId}`;
  const title = `New service ticket: ${input.ticketNumber}`;
  const text = `${title}

Subject: ${input.subject}
Priority: ${input.priority}
Source: ${input.source}

Open ticket: ${url}`;
  const html = groupEmailShell(
    title,
    `<p><strong>${input.subject}</strong></p>
     <p>Priority: ${input.priority}<br/>Source: ${input.source}</p>`,
    { label: "Open ticket", href: url }
  );
  return { subject: title, html, text };
}
