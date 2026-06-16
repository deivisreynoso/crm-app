import type { SupabaseClient } from "@supabase/supabase-js";
import { QUOTE_SEND_CATEGORY } from "@/lib/quotes/quote-send-template";
import { seedQuoteSendTemplates } from "@/lib/quotes/seed-quote-send-templates";

export type QuoteSendTemplate = {
  id: string;
  subject: string;
  body: string;
  locale: string;
};

function resolveContactLocale(preferredLanguage?: string | null): "en" | "es" {
  return preferredLanguage === "en" ? "en" : "es";
}

/** Pick quote_send template by contact preferred_language; falls back to English. */
export async function resolveQuoteSendTemplate(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  preferredLanguage?: string | null
): Promise<QuoteSendTemplate | null> {
  const locale = resolveContactLocale(preferredLanguage);

  const { data: preferred } = await supabase
    .from("email_templates")
    .select("id, subject, body, locale")
    .eq("user_id", workspaceOwnerId)
    .eq("category", QUOTE_SEND_CATEGORY)
    .eq("locale", locale)
    .maybeSingle();

  if (preferred?.id) {
    return preferred as QuoteSendTemplate;
  }

  if (locale !== "en") {
    const { data: english } = await supabase
      .from("email_templates")
      .select("id, subject, body, locale")
      .eq("user_id", workspaceOwnerId)
      .eq("category", QUOTE_SEND_CATEGORY)
      .eq("locale", "en")
      .maybeSingle();

    if (english?.id) return english as QuoteSendTemplate;
  }

  try {
    const seeded = await seedQuoteSendTemplates(supabase, workspaceOwnerId);
    const templateId = locale === "es" ? seeded.es : seeded.en;
    const { data } = await supabase
      .from("email_templates")
      .select("id, subject, body, locale")
      .eq("id", templateId)
      .maybeSingle();
    return (data as QuoteSendTemplate | null) ?? null;
  } catch (err) {
    console.error("resolveQuoteSendTemplate seed:", err);
    return null;
  }
}
