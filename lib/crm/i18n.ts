export const crmLocales = ["en", "es"] as const;
export type CrmLocale = (typeof crmLocales)[number];

export const defaultCrmLocale: CrmLocale = "en";

export function isCrmLocale(value: string): value is CrmLocale {
  return crmLocales.includes(value as CrmLocale);
}

export function resolveCrmLocale(value?: string | null): CrmLocale {
  if (value && isCrmLocale(value)) return value;
  return defaultCrmLocale;
}

export type CrmDictionary = typeof import("./locales/en.json");

export async function getCrmDictionary(locale: CrmLocale): Promise<CrmDictionary> {
  if (locale === "es") {
    return (await import("./locales/es.json")).default;
  }
  return (await import("./locales/en.json")).default;
}
