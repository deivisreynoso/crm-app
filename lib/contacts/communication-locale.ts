import type { CrmLocale } from "@/lib/crm/i18n";

/**
 * Locale for customer-facing email and public pages.
 * Uses contact preferred_language only — defaults to Spanish when unset.
 */
export function resolveContactCommunicationLocale(
  preferredLanguage?: string | null
): CrmLocale {
  return preferredLanguage?.trim().toLowerCase() === "en" ? "en" : "es";
}
