import type { SupabaseClient } from "@supabase/supabase-js";

export type ContactActivityType =
  | "email"
  | "call"
  | "meeting"
  | "task"
  | "note"
  | "system"
  | "update"
  | "created"
  | "review_request";

export async function logContactActivity(
  supabase: SupabaseClient,
  input: {
    userId: string;
    contactId: string;
    type: ContactActivityType;
    description: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("activities").insert([
    {
      user_id: input.userId,
      contact_id: input.contactId,
      type: input.type,
      description: input.description,
      metadata: input.metadata ?? {},
    },
  ]);

  if (error && !/does not exist|column|constraint/i.test(error.message)) {
    console.error("logContactActivity:", error.message);
  }
}
