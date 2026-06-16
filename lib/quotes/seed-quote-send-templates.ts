import type { SupabaseClient } from "@supabase/supabase-js";
import {
  QUOTE_SEND_CATEGORY,
  QUOTE_SEND_TEMPLATE_VARIABLES,
  quoteSendTemplateContent,
} from "@/lib/quotes/quote-send-template";

async function upsertQuoteSendTemplate(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  locale: "en" | "es"
): Promise<string> {
  const content = quoteSendTemplateContent(locale);

  const { data: existing } = await supabase
    .from("email_templates")
    .select("id")
    .eq("user_id", workspaceOwnerId)
    .eq("category", QUOTE_SEND_CATEGORY)
    .eq("locale", locale)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("email_templates")
    .insert([
      {
        user_id: workspaceOwnerId,
        name: content.name,
        subject: content.subject,
        body: content.body,
        category: QUOTE_SEND_CATEGORY,
        locale,
        variables: QUOTE_SEND_TEMPLATE_VARIABLES,
      },
    ])
    .select("id")
    .single();

  if (error || !created) {
    throw error ?? new Error(`Could not create quote_send template (${locale})`);
  }

  return created.id as string;
}

/** Ensure EN + ES quote_send templates exist for a workspace. */
export async function seedQuoteSendTemplates(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<{ en: string; es: string }> {
  const [en, es] = await Promise.all([
    upsertQuoteSendTemplate(supabase, workspaceOwnerId, "en"),
    upsertQuoteSendTemplate(supabase, workspaceOwnerId, "es"),
  ]);
  return { en, es };
}

/** Seed quote_send templates for every workspace owner (migration backfill). */
export async function seedAllWorkspaceQuoteSendTemplates(
  supabase: SupabaseClient
): Promise<number> {
  const { data: owners } = await supabase.from("user_settings").select("user_id");
  let count = 0;
  for (const row of owners ?? []) {
    try {
      await seedQuoteSendTemplates(supabase, row.user_id as string);
      count += 1;
    } catch (err) {
      console.error("seedQuoteSendTemplates:", row.user_id, err);
    }
  }
  return count;
}
