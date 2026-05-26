import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultReviewTemplateContent, REVIEW_TEMPLATE_CATEGORY } from "@/lib/reviews/default-review-template";
import type { CrmLocale } from "@/lib/crm/i18n";

export async function seedReviewRequestTemplate(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  locale: CrmLocale = "en"
) {
  const content = defaultReviewTemplateContent(locale);

  const { data: existing } = await supabase
    .from("email_templates")
    .select("id")
    .eq("user_id", workspaceOwnerId)
    .eq("category", REVIEW_TEMPLATE_CATEGORY)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: workspaceOwnerId,
          review_request_template_id: existing.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("email_templates")
    .insert([
      {
        user_id: workspaceOwnerId,
        name: content.name,
        subject: content.subject,
        body: content.body,
        category: REVIEW_TEMPLATE_CATEGORY,
        variables: ["first_name", "last_name", "google_review_url", "company"],
      },
    ])
    .select("id")
    .single();

  if (error || !created) {
    throw error ?? new Error("Could not create review template");
  }

  await supabase.from("user_settings").upsert(
    {
      user_id: workspaceOwnerId,
      review_request_template_id: created.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return created.id as string;
}
