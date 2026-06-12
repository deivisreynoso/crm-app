import { isOptionalEmptyMergeKey } from "@/lib/email/quote-email-merge";

export const TEMPLATE_VARIABLES = [
  "contact_name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "company",
  "service_name",
  "amount",
  "currency",
  "duration",
  "valid_until",
  "google_review_url",
  "quote_accept_url",
  "contact.name",
  "quote.accept_url",
  "user.signature",
  "user.firstname",
  "user.lastname",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export interface TemplateContext {
  contact_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  service_name?: string;
  amount?: string;
  currency?: string;
  duration?: string;
  valid_until?: string;
  google_review_url?: string;
  quote_accept_url?: string;
  [key: string]: string | undefined;
}

export function interpolateTemplate(
  content: string,
  context: Record<string, string | undefined>
): string {
  return content.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = context[key];
    if (value != null && value !== "") return String(value);
    if (isOptionalEmptyMergeKey(key)) return "";
    return `{{${key}}}`;
  });
}

export function buildTemplateContext(input: {
  contact?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
  } | null;
  company?: { name?: string } | null;
  document?: {
    title?: string;
    valid_until?: string;
    quote_accept_url?: string;
  };
  opportunity?: { title?: string; value?: number | null; currency?: string | null };
}): TemplateContext {
  const first = input.contact?.first_name ?? "";
  const last = input.contact?.last_name ?? "";
  const contactName = [first, last].filter(Boolean).join(" ");

  return {
    contact_name: contactName,
    first_name: first,
    last_name: last,
    email: input.contact?.email ?? "",
    phone: input.contact?.phone ?? "",
    company: input.company?.name ?? input.contact?.company ?? "",
    service_name: input.document?.title ?? input.opportunity?.title ?? "",
    amount:
      input.opportunity?.value != null
        ? String(input.opportunity.value)
        : "",
    currency: input.opportunity?.currency ?? "USD",
    duration: "",
    valid_until: input.document?.valid_until ?? "",
    quote_accept_url: input.document?.quote_accept_url ?? "",
  };
}
