import {
  buildTemplateContext,
  interpolateTemplate,
  TEMPLATE_VARIABLES,
  type TemplateContext,
} from "@/lib/documents/template-variables";

export { buildTemplateContext, interpolateTemplate, TEMPLATE_VARIABLES, type TemplateContext };

export type MergeFieldOption = {
  key: string;
  label: string;
};

export const MERGE_FIELD_LABELS: Record<string, string> = {
  contact_name: "Contact name",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  service_name: "Service / quote title",
  amount: "Amount",
  currency: "Currency",
  duration: "Duration",
  valid_until: "Valid until",
  google_review_url: "Google review URL",
};

export function listMergeFields(): MergeFieldOption[] {
  return TEMPLATE_VARIABLES.map((key) => ({
    key,
    label: MERGE_FIELD_LABELS[key] ?? key,
  }));
}

const MERGE_TOKEN = /\{\{\s*(\w+)\s*\}\}/g;

/** Highlight unresolved tokens for preview (returns HTML string). */
export function highlightUnresolvedMergeFields(html: string): string {
  return html.replace(MERGE_TOKEN, (match) => {
    return `<mark class="merge-unresolved" style="background:#fef3c7;color:#92400e;padding:0 2px;border-radius:2px">${match}</mark>`;
  });
}

/** Resolve merge fields; optionally strip any still-unresolved tokens before send. */
export function prepareBodyForSend(
  content: string,
  context: TemplateContext,
  options?: { stripUnresolved?: boolean }
): string {
  const strip = options?.stripUnresolved ?? true;
  let result = interpolateTemplate(content, context);
  if (strip) {
    result = result.replace(MERGE_TOKEN, "");
  }
  return result;
}

export function prepareSubjectForSend(
  subject: string,
  context: TemplateContext,
  options?: { stripUnresolved?: boolean }
): string {
  return prepareBodyForSend(subject, context, options);
}

export function hasUnresolvedMergeFields(content: string): boolean {
  return MERGE_TOKEN.test(content);
}
