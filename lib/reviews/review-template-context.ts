import {
  buildTemplateContext,
  interpolateTemplate,
} from "@/lib/documents/template-variables";

export function buildReviewTemplateContext(input: {
  contact: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  };
  companyName?: string | null;
  googleReviewUrl: string;
}) {
  return {
    ...buildTemplateContext({
      contact: {
        first_name: input.contact.first_name,
        last_name: input.contact.last_name,
        email: input.contact.email ?? undefined,
        phone: input.contact.phone ?? undefined,
        company: input.contact.company ?? undefined,
      },
      company: input.companyName ? { name: input.companyName } : null,
    }),
    google_review_url: input.googleReviewUrl,
  };
}

export function renderReviewEmail(input: {
  subject: string;
  body: string;
  contact: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
  };
  companyName?: string | null;
  googleReviewUrl: string;
}) {
  const ctx = buildReviewTemplateContext(input);
  return {
    subject: interpolateTemplate(input.subject, ctx),
    body: interpolateTemplate(input.body, ctx),
  };
}
