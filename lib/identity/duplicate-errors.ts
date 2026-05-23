import type { PostgrestError } from "@supabase/supabase-js";

export function contactWriteErrorMessage(err: PostgrestError | Error): string {
  const message = "message" in err ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("unique") && lower.includes("email")) {
    return "A contact with this email address already exists. Open the existing contact or use a different email.";
  }
  if (lower.includes("schema cache") || lower.includes("column")) {
    return "Your database needs the latest update. Please contact your administrator.";
  }

  return message;
}
