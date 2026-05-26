import type { SupabaseClient } from "@supabase/supabase-js";
import { formatEmailActivityContent } from "@/lib/activities/log-email-activity";

export async function logTicketEmailNote(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    ticketId: string;
    direction: "outbound" | "inbound";
    subject: string;
    body: string;
  }
) {
  const content = formatEmailActivityContent({
    direction: input.direction,
    subject: input.subject,
    body: input.body,
  });

  await supabase.from("notes").insert([
    {
      user_id: input.workspaceOwnerId,
      entity_type: "ticket",
      entity_id: input.ticketId,
      content,
      activity_type: "email",
    },
  ]);
}
