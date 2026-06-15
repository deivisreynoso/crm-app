import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveContactCommunicationLocale } from "@/lib/contacts/communication-locale";

export async function buildProjectWebhookContact(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  contactId: string,
  opportunity?: {
    project_feedback_token?: string | null;
    feedback_score?: number | null;
    feedback_notes?: Record<string, unknown> | null;
  }
) {
  const { data: contact } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, phone, preferred_language, review_request_opt_out"
    )
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!contact) return null;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://www.clickin360.com";
  const token = opportunity?.project_feedback_token?.trim() || null;

  return {
    id: contact.id,
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    preferred_language: resolveContactCommunicationLocale(contact.preferred_language),
    review_request_opt_out: contact.review_request_opt_out === true,
    project_feedback_token: token,
    project_feedback_url: token ? `${appUrl}/project-feedback/${token}` : null,
    feedback_score: opportunity?.feedback_score ?? null,
    feedback_notes: opportunity?.feedback_notes ?? null,
  };
}
