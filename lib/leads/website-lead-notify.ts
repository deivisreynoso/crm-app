import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmLocale } from "@/lib/crm/i18n";
import { sendMailgunEmail } from "@/lib/email/mailgun";
import { isMailgunConfigured } from "@/lib/email/mailgun-config";
import { appointmentConfirmationEmail } from "@/lib/email/appointment-confirmation";
import { websiteLeadAssigneeEmail } from "@/lib/email/website-lead-assignee";
import { createNotification } from "@/lib/notifications/create-notification";

export async function sendAppointmentConfirmationEmail(input: {
  to: string;
  locale: CrmLocale;
  name: string;
  slotLabel: string;
  timezone: string;
  meetLink?: string | null;
  reschedule?: boolean;
}): Promise<void> {
  if (!input.to.trim() || !isMailgunConfigured()) return;

  const mail = appointmentConfirmationEmail({
    locale: input.locale,
    name: input.name,
    slotLabel: input.slotLabel,
    timezone: input.timezone,
    meetLink: input.meetLink,
    reschedule: input.reschedule,
  });

  try {
    await sendMailgunEmail({
      to: input.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  } catch (err) {
    console.error("sendAppointmentConfirmationEmail:", err);
  }
}

export async function notifyWebsiteLeadAssignee(
  supabase: SupabaseClient,
  input: {
    workspaceOwnerId: string;
    assigneeId: string;
    contactId: string;
    leadName: string;
    leadEmail: string;
    source: "form" | "webchat";
    hasAppointment: boolean;
    returningVisitor: boolean;
  }
): Promise<void> {
  const title = input.returningVisitor
    ? "Returning website lead"
    : "New website lead";

  await createNotification(supabase, input.assigneeId, {
    kind: "opportunity_reminder",
    title,
    message: input.leadName,
    related_entity_type: "contact",
    related_entity_id: input.contactId,
  });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("website_leads_email_notify")
    .eq("user_id", input.workspaceOwnerId)
    .maybeSingle();

  const emailNotify = settings?.website_leads_email_notify !== false;

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("email_notifications, opportunity_reminders")
    .eq("user_id", input.assigneeId)
    .maybeSingle();

  if (!emailNotify || prefs?.opportunity_reminders === false) return;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("email, display_name")
    .eq("id", input.assigneeId)
    .maybeSingle();

  const assigneeEmail = (profile?.email as string | null)?.trim();
  if (!assigneeEmail || !isMailgunConfigured()) return;

  const mail = websiteLeadAssigneeEmail({
    assigneeName: (profile?.display_name as string) || "there",
    leadName: input.leadName,
    leadEmail: input.leadEmail,
    source: input.source,
    contactId: input.contactId,
    hasAppointment: input.hasAppointment,
    returningVisitor: input.returningVisitor,
  });

  try {
    await sendMailgunEmail({
      to: assigneeEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  } catch (err) {
    console.error("notifyWebsiteLeadAssignee email:", err);
  }
}
