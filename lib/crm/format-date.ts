import { resolveCrmLocale } from "@/lib/crm/i18n";

export function formatQuoteDate(
  value: string | Date,
  uiLocale?: string | null
): string {
  const locale = resolveCrmLocale(uiLocale) === "es" ? "es-MX" : "en-US";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
