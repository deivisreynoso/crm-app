import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications/create-notification";

export async function notifyInboundEmail(
  supabase: SupabaseClient,
  input: {
    recipientUserId: string;
    contactId: string;
    contactName: string;
    subject: string;
  }
) {
  const subject = input.subject.trim() || "(No subject)";
  await createNotification(supabase, input.recipientUserId, {
    kind: "email_received",
    title: `Email from ${input.contactName}`,
    message: subject,
    related_entity_type: "contact",
    related_entity_id: input.contactId,
  });
}
