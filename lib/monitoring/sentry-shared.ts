const sentryDsn =
  process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

export function isSentryEnabled() {
  return Boolean(sentryDsn);
}

export function getSentryDsn() {
  return sentryDsn;
}

export const sentryTracesSampleRate =
  process.env.NODE_ENV === "development" ? 1.0 : 0.1;
