import type { CrmLocale } from "@/lib/crm/i18n";
import { sendMailgunEmail } from "@/lib/email/mailgun";
import { isMailgunConfigured } from "@/lib/email/mailgun-config";
import { appointmentConfirmationEmail } from "@/lib/email/appointment-confirmation";

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
