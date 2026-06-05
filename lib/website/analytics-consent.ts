export const ANALYTICS_CONSENT_COOKIE = "clickin_analytics_consent";

export const ANALYTICS_CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export type AnalyticsConsent = "granted" | "denied";

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-QRDLH77S1V";

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ANALYTICS_CONSENT_COOKIE}=([^;]*)`)
  );
  const value = match?.[1];
  if (value === "granted" || value === "denied") return value;
  return null;
}

export function setAnalyticsConsent(value: AnalyticsConsent) {
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; path=/; max-age=${ANALYTICS_CONSENT_MAX_AGE}; SameSite=Lax`;
}

export function grantAnalyticsConsent() {
  setAnalyticsConsent("granted");
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("consent", "update", { analytics_storage: "granted" });
  }
}

export function denyAnalyticsConsent() {
  setAnalyticsConsent("denied");
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("consent", "update", { analytics_storage: "denied" });
  }
}
