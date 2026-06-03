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
