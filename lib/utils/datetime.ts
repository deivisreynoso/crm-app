/**
 * Postgres `timestamp` (no time zone) values from Supabase are UTC wall time
 * without a suffix — parse them as UTC, not browser-local.
 */
export function parseStoredTimestamp(value: string | Date): Date {
  if (value instanceof Date) return value;
  const raw = value.trim();
  if (!raw) return new Date(Number.NaN);

  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)) {
    return new Date(raw);
  }

  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  return new Date(`${normalized}Z`);
}

/** Format date/time in a specific IANA timezone (falls back to local). */
export function formatDateTimeInTimeZone(
  date: string | Date,
  timeZone?: string | null,
  locale = "en-US"
): string {
  const d = parseStoredTimestamp(date);
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

/** Contact record timezone first — for contact-centric fields (e.g. review sent at). */
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

const LEGACY_DEFAULT_TIMEZONE = "UTC";

/** Viewer timezone: saved preference, treating legacy UTC default as unset, then browser. */
export function resolveViewerTimeZone(
  savedTimezone?: string | null,
  browserTimezone?: string | null
): string {
  const saved = savedTimezone?.trim();
  if (saved && saved !== LEGACY_DEFAULT_TIMEZONE) return saved;

  const browser = browserTimezone?.trim();
  if (browser) return browser;

  return saved || LEGACY_DEFAULT_TIMEZONE;
}

export function browserTimeZone(): string {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) return "UTC";
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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
  const d = parseStoredTimestamp(date);
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
