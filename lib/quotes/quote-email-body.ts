import { resolveCrmLocale } from "@/lib/crm/i18n";

/** Ensure the public accept URL appears in the outgoing quote email body. */
export function ensureAcceptLinkInEmailBody(
  body: string,
  acceptUrl: string | null | undefined,
  uiLocale?: string | null
): string {
  const url = acceptUrl?.trim();
  if (!url || body.includes(url)) return body;

  const locale = resolveCrmLocale(uiLocale);
  const isHtml = /<[a-z][\s\S]*>/i.test(body);

  if (locale === "es") {
    if (isHtml) {
      return `${body}<p>Revise y acepte su cotización en línea:</p><p><a href="${url}">${url}</a></p>`;
    }
    return `${body}\n\nRevise y acepte su cotización en línea:\n${url}`;
  }

  if (isHtml) {
    return `${body}<p>Please review and accept your quote online:</p><p><a href="${url}">${url}</a></p>`;
  }
  return `${body}\n\nPlease review and accept your quote online:\n${url}`;
}
