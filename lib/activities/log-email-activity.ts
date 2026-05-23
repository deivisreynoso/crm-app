import type { SupabaseClient } from "@supabase/supabase-js";
import { logContactActivity } from "@/lib/activities/log-contact-activity";

export type EmailActivityInput = {
  userId: string;
  contactId: string;
  direction: "outbound" | "inbound";
  subject: string;
  body: string;
  to?: string | null;
  from?: string | null;
  gmail_message_id?: string | null;
  gmail_thread_id?: string | null;
};

export function formatEmailActivityContent(input: {
  direction: "outbound" | "inbound";
  subject: string;
  body: string;
}): string {
  const label = input.direction === "inbound" ? "Email received" : "Email sent";
  const subject = input.subject.trim() || "(No subject)";
  const body = input.body.trim() || "";
  return body ? `${label}: ${subject}\n\n${body}` : `${label}: ${subject}`;
}

export async function logEmailContactActivity(
  supabase: SupabaseClient,
  input: EmailActivityInput
) {
  if (input.gmail_message_id) {
    const { data: existing } = await supabase
      .from("activities")
      .select("id")
      .eq("contact_id", input.contactId)
      .eq("type", "email")
      .filter("metadata->>gmail_message_id", "eq", input.gmail_message_id)
      .maybeSingle();

    if (existing) return;
  }

  const subject = input.subject.trim() || "(No subject)";
  const label = input.direction === "inbound" ? "Email received" : "Email sent";

  await logContactActivity(supabase, {
    userId: input.userId,
    contactId: input.contactId,
    type: "email",
    description: `${label}: ${subject}`,
    metadata: {
      direction: input.direction,
      subject,
      body: input.body,
      to: input.to ?? null,
      from: input.from ?? null,
      gmail_message_id: input.gmail_message_id ?? null,
      gmail_thread_id: input.gmail_thread_id ?? null,
    },
  });
}
