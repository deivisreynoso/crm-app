export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

/** Prefer Spanish for Mexico/LATAM browser tags; English otherwise. */
export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const lower = acceptLanguage.toLowerCase();
  if (
    lower.startsWith("es") ||
    /\b(mx|ar|co|cl|pe|ve|ec|gt|cu|bo|do|hn|py|sv|ni|cr|pa|uy|pr)\b/i.test(
      lower
    )
  ) {
    return "es";
  }
  if (lower.startsWith("en")) return "en";
  return defaultLocale;
}

export type WebsiteDictionary = typeof import("./locales/es.json");

export async function getDictionary(locale: Locale): Promise<WebsiteDictionary> {
  switch (locale) {
    case "es":
      return (await import("./locales/es.json")).default;
    default:
      return (await import("./locales/en.json")).default;
  }
}
