import type { CrmLocale } from "@/lib/crm/i18n";

export const REVIEW_TEMPLATE_CATEGORY = "review_request";

export function defaultReviewTemplateContent(locale: CrmLocale) {
  if (locale === "es") {
    return {
      name: "Invitación reseña Google",
      subject: "¿Nos dejas una reseña en Google, {{first_name}}?",
      body: `Hola {{first_name}},

Gracias por trabajar con nosotros. Si tuviste una buena experiencia, nos ayudaría mucho una reseña breve en Google:

{{google_review_url}}

Solo toma un minuto. ¡Gracias!
`,
    };
  }
  return {
    name: "Google review request",
    subject: "Would you leave us a Google review, {{first_name}}?",
    body: `Hi {{first_name}},

Thank you for working with us. If you had a good experience, a quick Google review would mean a lot:

{{google_review_url}}

It only takes a minute. Thank you!
`,
  };
}
