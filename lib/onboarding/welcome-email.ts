import type { OnboardingLocale } from "@/lib/onboarding/questionnaire-copy";

export function buildOnboardingWelcomeEmail(input: {
  firstName: string;
  locale: OnboardingLocale;
  onboardingUrl: string;
}): { subject: string; text: string } {
  const name = input.firstName.trim() || "there";
  const url = input.onboardingUrl.trim();

  if (input.locale === "en") {
    return {
      subject: "Welcome to ClickIn 360 — next steps",
      text: `Hi ${name},

Welcome to ClickIn 360! Your onboarding has started.

Complete the questionnaire at the link below. At the end you can schedule your project kickoff meeting:

${url}

Thank you!`,
    };
  }

  return {
    subject: "Bienvenido a ClickIn 360 — siguientes pasos",
    text: `Hola ${name},

¡Bienvenido a ClickIn 360! Tu incorporación ha comenzado.

Completa el cuestionario en el siguiente enlace. Al final podrás agendar tu reunión de inicio de proyecto:

${url}

¡Gracias!`,
  };
}
