import type { CrmLocale } from "@/lib/crm/i18n";
import { CLICKIN360_BRAND } from "@/lib/brand";
import { sendEmail } from "@/lib/email/send";

export function projectFeedbackThankYouEmail(input: {
  locale: CrmLocale;
  firstName: string;
  to: string;
}) {
  const brand = CLICKIN360_BRAND;
  const isEn = input.locale === "en";
  const subject = isEn
    ? `Thank you for your feedback, ${input.firstName}`
    : `Gracias por tu feedback, ${input.firstName}`;
  const text = isEn
    ? `Hi ${input.firstName},\n\nThank you for taking a moment to share your experience with ${brand}. Your feedback helps us improve.\n\n— ${brand}`
    : `Hola ${input.firstName},\n\nGracias por compartir tu experiencia con ${brand}. Tu feedback nos ayuda a mejorar.\n\n— ${brand}`;
  const html = text.replace(/\n/g, "<br/>");

  return { subject, text, html };
}

export async function sendProjectFeedbackThankYou(input: {
  locale: CrmLocale;
  firstName: string;
  to: string;
}) {
  const { subject, text, html } = projectFeedbackThankYouEmail(input);
  await sendEmail({ to: input.to, subject, html, text });
}
