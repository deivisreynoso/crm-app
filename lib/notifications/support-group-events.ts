import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emailSupportGroup,
  notifySupportGroupInApp,
  supportTicketGroupEmail,
} from "@/lib/notifications/workspace-groups";

export async function notifySupportGroupNewTicket(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    ticketId: string;
    ticketNumber: string;
    subject: string;
    priority: string;
    source: string;
    title?: string;
    message?: string;
  }
): Promise<void> {
  const title = input.title ?? "New service ticket";
  const message =
    input.message ?? `${input.ticketNumber}: ${input.subject}`.trim();

  await notifySupportGroupInApp(supabase, input.workspaceOwnerId, {
    title,
    message,
    related_entity_type: "ticket",
    related_entity_id: input.ticketId,
  });

  const mail = supportTicketGroupEmail({
    ticketNumber: input.ticketNumber,
    subject: input.subject,
    priority: input.priority,
    source: input.source,
    ticketId: input.ticketId,
  });

  await emailSupportGroup(
    supabase,
    input.workspaceOwnerId,
    mail.subject,
    mail.html,
    mail.text
  );
}
