import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveOnboardingTaskTemplate,
  type OnboardingTaskTemplateItem,
} from "@/lib/onboarding/defaults";
import { fireWebhook } from "@/lib/webhooks/outbound";
import { logContactActivity } from "@/lib/activities/log-contact-activity";

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function ensureContactOnboardingTokens(
  supabase: SupabaseClient,
  contactId: string,
  workspaceOwnerId: string
): Promise<{ onboarding_token: string; feedback_token: string }> {
  const { data: contact } = await supabase
    .from("contacts")
    .select("onboarding_token, feedback_token")
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!contact) throw new Error("Contact not found");

  const patch: Record<string, string> = {};
  if (!contact.onboarding_token) patch.onboarding_token = randomToken();
  if (!contact.feedback_token) patch.feedback_token = randomToken();

  if (Object.keys(patch).length > 0) {
    await supabase.from("contacts").update(patch).eq("id", contactId);
  }

  return {
    onboarding_token: (patch.onboarding_token ?? contact.onboarding_token) as string,
    feedback_token: (patch.feedback_token ?? contact.feedback_token) as string,
  };
}

function dueDateFromDays(days: number | undefined): string | null {
  if (!days || days <= 0) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function createOnboardingTasksFromTemplate(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  contactId: string,
  template: OnboardingTaskTemplateItem[],
  locale: "en" | "es" = "en"
) {
  for (const item of template) {
    const title = locale === "es" ? item.title_es : item.title_en;
    const description =
      locale === "es" ? item.description_es : item.description_en;
    await supabase.from("tasks").insert({
      user_id: workspaceOwnerId,
      contact_id: contactId,
      title,
      description: description ?? null,
      status: "pending",
      priority: "medium",
      due_at: dueDateFromDays(item.due_days),
    });
  }
}

export async function startContactOnboarding(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  contactId: string,
  options?: { actorUserId?: string; manual?: boolean }
): Promise<{ onboarding_token: string; feedback_token: string }> {
  const { data: settings } = await supabase
    .from("user_settings")
    .select("onboarding_enabled, onboarding_task_template, ui_locale")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (settings?.onboarding_enabled === false) {
    throw new Error("Onboarding automation is disabled for this workspace.");
  }

  const tokens = await ensureContactOnboardingTokens(
    supabase,
    contactId,
    workspaceOwnerId
  );
  const now = new Date().toISOString();

  await supabase
    .from("contacts")
    .update({
      onboarding_started_at: now,
      onboarding_completed_at: null,
      updated_at: now,
    })
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId);

  const template = resolveOnboardingTaskTemplate(settings?.onboarding_task_template);
  const locale = settings?.ui_locale === "es" ? "es" : "en";
  await createOnboardingTasksFromTemplate(
    supabase,
    workspaceOwnerId,
    contactId,
    template,
    locale
  );

  await logContactActivity(supabase, {
    userId: workspaceOwnerId,
    contactId,
    type: "system",
    description: options?.manual
      ? "Onboarding started manually"
      : "Onboarding started automatically",
    metadata: { source: options?.manual ? "manual" : "automation" },
  });

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();

  if (options?.manual) {
    void fireWebhook(supabase, workspaceOwnerId, "onboarding.manual_start", {
      contact_id: contactId,
      contact,
      onboarding_token: tokens.onboarding_token,
      feedback_token: tokens.feedback_token,
      manual: true,
      actor_user_id: options?.actorUserId ?? null,
    });
  }

  return tokens;
}
