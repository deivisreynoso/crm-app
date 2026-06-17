/** Stored when the user wants CRM times to follow the device/browser clock. */
export const AUTO_DISPLAY_TIMEZONE = "auto";

export type DisplayTimezoneOption = {
  value: string;
  label: string;
  group: "Auto" | "Americas" | "Europe & Africa" | "Other";
};

export const DISPLAY_TIMEZONE_OPTIONS: DisplayTimezoneOption[] = [
  { value: AUTO_DISPLAY_TIMEZONE, label: "Use device timezone", group: "Auto" },
  {
    value: "America/Mexico_City",
    label: "Mexico City — Central",
    group: "Americas",
  },
  {
    value: "America/Monterrey",
    label: "Monterrey — Central",
    group: "Americas",
  },
  {
    value: "America/Tijuana",
    label: "Tijuana — Pacific",
    group: "Americas",
  },
  {
    value: "America/New_York",
    label: "US Eastern",
    group: "Americas",
  },
  {
    value: "America/Chicago",
    label: "US Central",
    group: "Americas",
  },
  {
    value: "America/Denver",
    label: "US Mountain",
    group: "Americas",
  },
  {
    value: "America/Phoenix",
    label: "US Arizona",
    group: "Americas",
  },
  {
    value: "America/Los_Angeles",
    label: "US Pacific",
    group: "Americas",
  },
  {
    value: "America/Puerto_Rico",
    label: "Puerto Rico — Atlantic",
    group: "Americas",
  },
  {
    value: "America/Bogota",
    label: "Bogotá — Colombia",
    group: "Americas",
  },
  {
    value: "America/Lima",
    label: "Lima — Peru",
    group: "Americas",
  },
  {
    value: "America/Sao_Paulo",
    label: "São Paulo — Brazil",
    group: "Americas",
  },
  {
    value: "Europe/London",
    label: "London — UK",
    group: "Europe & Africa",
  },
  {
    value: "Europe/Madrid",
    label: "Madrid — Spain",
    group: "Europe & Africa",
  },
  { value: "UTC", label: "UTC", group: "Other" },
];

const LEGACY_AUTO_VALUES = new Set(["", "UTC", AUTO_DISPLAY_TIMEZONE]);

export function isAutoDisplayTimezone(timezone?: string | null): boolean {
  const value = timezone?.trim();
  if (!value) return true;
  return LEGACY_AUTO_VALUES.has(value);
}

export function storedTimezoneToSelectValue(timezone?: string | null): string {
  if (isAutoDisplayTimezone(timezone)) return AUTO_DISPLAY_TIMEZONE;
  return timezone!.trim();
}

export function formatDisplayTimezoneLabel(
  timezone: string,
  browserTimezone?: string | null
): string {
  if (isAutoDisplayTimezone(timezone)) {
    const browser = browserTimezone?.trim();
    return browser
      ? `Device (${browser.replace(/_/g, " ")})`
      : "Device timezone";
  }
  const match = DISPLAY_TIMEZONE_OPTIONS.find((o) => o.value === timezone);
  return match?.label ?? timezone.replace(/_/g, " ");
}

export function formatCurrentClockPreview(
  timeZone: string,
  locale = "en-US"
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date());
  } catch {
    return "";
  }
}
