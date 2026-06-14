import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationKind =
  | "task_reminder"
  | "opportunity_reminder"
  | "ticket_update"
  | "email_received"
  | "finance_payment_received"
  | "finance_invoice_overdue"
  | "conversation_review"
  | "sales_website_lead"
  | "sales_invoice_paid"
  | "sales_quote_accepted"
  | "sales_quote_declined"
  | "support_ticket_received";

const PREF_KEY: Record<NotificationKind, keyof NotificationPrefs> = {
  task_reminder: "task_reminders",
  opportunity_reminder: "opportunity_reminders",
  ticket_update: "ticket_notifications",
  email_received: "email_notifications",
  finance_payment_received: "finance_notifications",
  finance_invoice_overdue: "finance_notifications",
  conversation_review: "conversation_notifications",
  sales_website_lead: "sales_notifications",
  sales_invoice_paid: "sales_notifications",
  sales_quote_accepted: "sales_notifications",
  sales_quote_declined: "sales_notifications",
  support_ticket_received: "support_notifications",
};

type NotificationPrefs = {
  task_reminders: boolean;
  opportunity_reminders: boolean;
  ticket_notifications: boolean;
  email_notifications: boolean;
  finance_notifications: boolean;
  conversation_notifications: boolean;
  sales_notifications: boolean;
  support_notifications: boolean;
};

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  input: {
    kind: NotificationKind;
    title: string;
    message?: string;
    related_entity_type?: string;
    related_entity_id?: string;
  }
) {
  const prefColumns =
    "task_reminders, opportunity_reminders, ticket_notifications, email_notifications, finance_notifications, conversation_notifications, sales_notifications, support_notifications";

  const { data: initialPrefs, error: prefError } = await supabase
    .from("notification_preferences")
    .select(prefColumns)
    .eq("user_id", userId)
    .maybeSingle();

  let prefs = initialPrefs;

  if (
    prefError &&
    /conversation_notifications|sales_notifications|support_notifications|schema cache|could not find/i.test(
      prefError.message
    )
  ) {
    ({ data: prefs } = await supabase
      .from("notification_preferences")
      .select(
        "task_reminders, opportunity_reminders, ticket_notifications, email_notifications, finance_notifications, conversation_notifications"
      )
      .eq("user_id", userId)
      .maybeSingle());
  }

  const prefKey = PREF_KEY[input.kind];
  const missingPrefColumn =
    prefs &&
    ((prefKey === "conversation_notifications" &&
      !("conversation_notifications" in prefs)) ||
      ((prefKey === "sales_notifications" || prefKey === "support_notifications") &&
        !(prefKey in prefs)));

  const enabled = missingPrefColumn
    ? true
    : (prefs?.[prefKey as keyof NotificationPrefs] ?? true);
  if (!enabled) return null;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      type: input.kind,
      title: input.title,
      message: input.message ?? null,
      related_entity_type: input.related_entity_type ?? null,
      related_entity_id: input.related_entity_id ?? null,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error("createNotification:", error.message);
    return null;
  }

  return data;
}
