import * as Sentry from "@sentry/nextjs";

type SentryActor = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export function applySentryRequestContext(
  actor: SentryActor | null | undefined,
  route: string
) {
  if (actor?.id) {
    Sentry.setUser({
      id: actor.id,
      email: actor.email ?? undefined,
      username: actor.name ?? undefined,
    });
  }

  Sentry.setTag("route", route);
  Sentry.setContext("request", {
    route,
    capturedAt: new Date().toISOString(),
  });
}
