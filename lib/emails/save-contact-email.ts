import type { SupabaseClient } from "@supabase/supabase-js";

export type ContactEmailDirection = "outbound" | "inbound";

export type ContactEmailRecord = {
  user_id: string;
  contact_id: string;
  direction: ContactEmailDirection;
  gmail_message_id: string;
  gmail_thread_id?: string | null;
  from_email?: string | null;
  to_email?: string | null;
  subject?: string | null;
  body: string;
  sent_at: string;
};

export async function saveContactEmail(
  supabase: SupabaseClient,
  record: ContactEmailRecord
) {
  const { error } = await supabase.from("contact_emails").upsert(
    {
      user_id: record.user_id,
      contact_id: record.contact_id,
      direction: record.direction,
      gmail_message_id: record.gmail_message_id,
      gmail_thread_id: record.gmail_thread_id ?? null,
      from_email: record.from_email ?? null,
      to_email: record.to_email ?? null,
      subject: record.subject ?? null,
      body: record.body,
      sent_at: record.sent_at,
    },
    { onConflict: "user_id,gmail_message_id" }
  );

  if (error) {
    console.error("saveContactEmail:", error.message);
    throw error;
  }
}
