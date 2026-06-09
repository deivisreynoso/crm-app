function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    );
  } catch {
    return false;
  }
}

/** Public app origin for auth redirects (Supabase allow-list must include these URLs). */
export function resolvePublicAppOrigin(requestUrl?: string): string {
  const fromPublicEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromPublicEnv) return fromPublicEnv;

  const fromNextAuth = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (fromNextAuth) return fromNextAuth;

  if (requestUrl) {
    try {
      const origin = new URL(requestUrl).origin;
      if (!isLocalOrigin(origin)) return origin;
    } catch {
      /* fall through */
    }
  }

  if (typeof window !== "undefined") {
    const browserOrigin = window.location.origin;
    if (!isLocalOrigin(browserOrigin)) return browserOrigin;
  }

  return "http://localhost:3000";
}

/** @deprecated Prefer resolvePublicAppOrigin for auth flows. */
export function getAppOrigin(): string {
  return resolvePublicAppOrigin();
}

export function passwordResetCallbackUrl(requestUrl?: string): string {
  return `${resolvePublicAppOrigin(requestUrl)}/auth/callback?next=/reset-password`;
}
