import type { CrmLocale } from "@/lib/crm/i18n";
import { sendEmail } from "@/lib/email/send";

export function projectFeedbackThankYouEmail(input: {
  locale: CrmLocale;
  firstName: string;
  companyName: string;
  to: string;
}) {
  const isEn = input.locale === "en";
  const subject = isEn
    ? `Thank you for your feedback, ${input.firstName}`
    : `Gracias por tu feedback, ${input.firstName}`;
  const text = isEn
    ? `Hi ${input.firstName},\n\nThank you for taking a moment to share your experience with ${input.companyName}. Your feedback helps us improve.\n\n— ${input.companyName}`
    : `Hola ${input.firstName},\n\nGracias por compartir tu experiencia con ${input.companyName}. Tu feedback nos ayuda a mejorar.\n\n— ${input.companyName}`;
  const html = text.replace(/\n/g, "<br/>");

  return { subject, text, html };
}

export async function sendProjectFeedbackThankYou(input: {
  locale: CrmLocale;
  firstName: string;
  companyName: string;
  to: string;
}) {
  const { subject, text, html } = projectFeedbackThankYouEmail(input);
  await sendEmail({ to: input.to, subject, html, text });
}
