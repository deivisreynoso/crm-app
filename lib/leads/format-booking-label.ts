export function formatBookingSlotLabel(
  startIso: string,
  timeZone: string,
  lang: "es" | "en"
): string {
  const d = new Date(startIso);
  const locale = lang === "es" ? "es-MX" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}
