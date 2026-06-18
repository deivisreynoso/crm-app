"use client";

import * as Sentry from "@sentry/nextjs";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function SentryUserBridge() {
  const { data: session } = useSession();

  useEffect(() => {
    const user = session?.user;
    if (user?.id) {
      Sentry.setUser({
        id: user.id,
        email: user.email ?? undefined,
        username: user.name ?? undefined,
      });
      return;
    }

    Sentry.setUser(null);
  }, [session]);

  return null;
}
