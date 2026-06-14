import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  allocateCustomerId,
  findContactByCustomerId,
  isValidCustomerIdFormat,
  normalizeCustomerId,
} from "@/lib/contacts/customer-id";
import { generateServiceTicketNumber } from "@/lib/service-ticket-number";
import { sendEmail } from "@/lib/email/send";
import { supportTicketConfirmationEmail, parseSupportLocale } from "@/lib/email/support-ticket-confirmation";
import { logContactActivity } from "@/lib/activities/log-contact-activity";
import { createNotification } from "@/lib/notifications/create-notification";
import { notifySupportGroupNewTicket } from "@/lib/notifications/support-group-events";
import type { CrmLocale } from "@/lib/crm/i18n";

const SESSION_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSupportCidSession(
  supabase: SupabaseClient,
  customerId: string,
  language: CrmLocale = "en"
): Promise<{ token: string } | null> {
  const contact = await findContactByCustomerId(supabase, customerId);
  if (!contact) return null;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("support_widget_enabled")
    .eq("user_id", contact.user_id)
    .maybeSingle();

  if (!settings?.support_widget_enabled) return null;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await supabase.from("support_cid_sessions").delete().lt("expires_at", new Date().toISOString());

  let { error } = await supabase.from("support_cid_sessions").insert({
    workspace_owner_id: contact.user_id,
    contact_id: contact.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    language,
  });

  if (error && /language/i.test(error.message)) {
    ({ error } = await supabase.from("support_cid_sessions").insert({
      workspace_owner_id: contact.user_id,
      contact_id: contact.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    }));
  }

  if (error) {
    console.error("createSupportCidSession:", error.message);
    return null;
  }

  return { token };
}

export async function resolveSupportSession(
  supabase: SupabaseClient,
  sessionToken: string
): Promise<{ workspaceOwnerId: string; contactId: string; language: CrmLocale } | null> {
  const token = sessionToken?.trim();
  if (!token) return null;

  const { data } = await supabase
    .from("support_cid_sessions")
    .select("workspace_owner_id, contact_id, expires_at, language")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) {
    await supabase
      .from("support_cid_sessions")
      .delete()
      .eq("token_hash", hashToken(token));
    return null;
  }

  return {
    workspaceOwnerId: data.workspace_owner_id as string,
    contactId: data.contact_id as string,
    language: parseSupportLocale(data.language as string | null),
  };
}

export type PublicSupportTicketInput = {
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
};

export async function createPublicSupportTicket(
  supabase: SupabaseClient,
  session: { workspaceOwnerId: string; contactId: string; language: CrmLocale },
  input: PublicSupportTicketInput
): Promise<{ ticketNumber: string; ticketId: string } | null> {
  const { data: settings } = await supabase
    .from("user_settings")
    .select("support_widget_assignee, support_widget_email_notify")
    .eq("user_id", session.workspaceOwnerId)
    .maybeSingle();

  const assignee =
    (settings?.support_widget_assignee as string | null) ?? session.workspaceOwnerId;

  const ticketNumber = await generateServiceTicketNumber(session.workspaceOwnerId);
  const subject = input.subject.trim();
  const description = input.description.trim();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      user_id: session.workspaceOwnerId,
      contact_id: session.contactId,
      subject,
      title: subject,
      description,
      status: "open",
      priority: input.priority,
      assigned_to: assignee,
      source: "website_widget",
      ticket_number: ticketNumber,
    })
    .select("id, ticket_number")
    .single();

  if (error || !ticket) {
    console.error("createPublicSupportTicket:", error?.message);
    return null;
  }

  const ref = (ticket.ticket_number as string) || ticket.id;
  const label = ref ? `${ref}: ${subject}` : subject;

  await logContactActivity(supabase, {
    userId: session.workspaceOwnerId,
    contactId: session.contactId,
    type: "created",
    createdByDisplayName: "Customer portal",
    description: `Support ticket submitted via website: ${label}`,
    metadata: {
      ticket_id: ticket.id,
      source: "website_widget",
      priority: input.priority,
      subject,
    },
  });

  await createNotification(supabase, assignee, {
    kind: "ticket_update",
    title: "New support ticket (customer portal)",
    message: label,
    related_entity_type: "ticket",
    related_entity_id: ticket.id as string,
  });

  void notifySupportGroupNewTicket(supabase, {
    workspaceOwnerId: session.workspaceOwnerId,
    ticketId: ticket.id as string,
    ticketNumber: ref,
    subject,
    priority: input.priority,
    source: "website_widget",
    title: "New support ticket (customer portal)",
    message: label,
  });

  if (settings?.support_widget_email_notify !== false) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("email, first_name, last_name")
      .eq("id", session.contactId)
      .maybeSingle();

    const to = (contact?.email as string | null)?.trim();
    if (to) {
      const name = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ");
      const mail = supportTicketConfirmationEmail({
        locale: session.language,
        name,
        reference: ref,
        subject,
        priority: input.priority,
      });

      try {
        await sendEmail({
          to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
      } catch (err) {
        console.error("support ticket confirmation email:", err);
      }
    }
  }

  await supabase
    .from("support_cid_sessions")
    .delete()
    .eq("workspace_owner_id", session.workspaceOwnerId)
    .eq("contact_id", session.contactId);

  return {
    ticketId: ticket.id as string,
    ticketNumber: (ticket.ticket_number as string) || ticket.id,
  };
}

export { isValidCustomerIdFormat, normalizeCustomerId, allocateCustomerId };
