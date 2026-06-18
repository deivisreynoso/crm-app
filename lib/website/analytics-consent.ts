export const ANALYTICS_CONSENT_COOKIE = "clickin_analytics_consent";

export const ANALYTICS_CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export type AnalyticsConsent = "granted" | "denied";

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export function isGaConfigured() {
  return Boolean(GA_MEASUREMENT_ID);
}

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

function updateGtagConsent(value: AnalyticsConsent, attempt = 0) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: value === "granted" ? "granted" : "denied",
    });
    return;
  }
  if (attempt < 40) {
    window.setTimeout(() => updateGtagConsent(value, attempt + 1), 50);
  }
}

export function grantAnalyticsConsent() {
  setAnalyticsConsent("granted");
  updateGtagConsent("granted");
}

export function denyAnalyticsConsent() {
  setAnalyticsConsent("denied");
  updateGtagConsent("denied");
}
