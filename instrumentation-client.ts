import * as Sentry from "@sentry/nextjs";
import { getSentryDsn, isSentryEnabled, sentryTracesSampleRate } from "@/lib/monitoring/sentry-shared";

Sentry.init({
  dsn: getSentryDsn(),
  enabled: isSentryEnabled(),
  environment: process.env.NODE_ENV,
  tracesSampleRate: sentryTracesSampleRate,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
