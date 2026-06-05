/** Format date/time in a specific IANA timezone (falls back to local). */
export function formatDateTimeInTimeZone(
  date: string | Date,
  timeZone?: string | null,
  locale = "en-US"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };

  try {
    if (timeZone?.trim()) {
      return d.toLocaleString(locale, { ...options, timeZone: timeZone.trim() });
    }
  } catch {
    /* invalid timezone */
  }

  return d.toLocaleString(locale, options);
}

export function resolveDisplayTimeZone(
  contactTimezone?: string | null,
  userTimezone?: string | null
): string | undefined {
  const ct = contactTimezone?.trim();
  if (ct) return ct;
  const ut = userTimezone?.trim();
  if (ut) return ut;
  return undefined;
}

const CRM_LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
};

/** Salesforce-style timeline header: "May 26, 2026 at 5:09 PM" */
export function formatTimelineDateTime(
  date: string | Date,
  timeZone?: string | null,
  locale = "en-US"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";

  const intlLocale = CRM_LOCALE_MAP[locale] ?? locale;
  const tz = timeZone?.trim() || undefined;
  const dateOpts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: tz,
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  };

  try {
    const datePart = d.toLocaleDateString(intlLocale, dateOpts);
    const timePart = d.toLocaleTimeString(intlLocale, timeOpts);
    const connector = intlLocale.startsWith("es") ? " a las " : " at ";
    return `${datePart}${connector}${timePart}`;
  } catch {
    return d.toLocaleString(intlLocale);
  }
}
