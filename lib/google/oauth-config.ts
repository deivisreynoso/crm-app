/** OAuth callback path — must match a route under app/api/auth/google-calendar/callback */
export const GOOGLE_CALENDAR_CALLBACK_PATH = "/api/auth/google-calendar/callback";

/** OAuth callback path — must match a route under app/api/auth/google-gmail/callback */
export const GOOGLE_GMAIL_CALLBACK_PATH = "/api/auth/google-gmail/callback";

/** Primary: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. Legacy alias: GOOGLE_OAUTH_* */
export function getGoogleOAuthClientId(): string | undefined {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    undefined
  );
}

export function getGoogleOAuthClientSecret(): string | undefined {
  return (
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    undefined
  );
}

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

/**
 * Public origin for OAuth redirect URIs. Prefer NEXT_PUBLIC_APP_URL so Docker/VPS
 * builds do not use the container's internal localhost when the browser hits the real domain.
 */
function resolveOAuthOrigin(requestUrl?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) return appUrl;

  if (requestUrl) {
    try {
      const origin = new URL(requestUrl).origin;
      if (!isLocalOrigin(origin)) return origin;
    } catch {
      /* fall through */
    }
  }

  return "http://localhost:3000";
}

/**
 * Redirect URI sent to Google. Must match **exactly** an entry in Google Cloud Console
 * → APIs & Services → Credentials → OAuth client → Authorized redirect URIs.
 */
export function getGoogleCalendarRedirectUri(requestUrl?: string): string {
  const fromEnv = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;

  return `${resolveOAuthOrigin(requestUrl)}${GOOGLE_CALENDAR_CALLBACK_PATH}`;
}

export function getGoogleGmailRedirectUri(requestUrl?: string): string {
  const fromEnv = process.env.GOOGLE_GMAIL_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;

  return `${resolveOAuthOrigin(requestUrl)}${GOOGLE_GMAIL_CALLBACK_PATH}`;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(getGoogleOAuthClientId() && getGoogleOAuthClientSecret());
}

export function isGoogleGmailConfigured(): boolean {
  return isGoogleOAuthConfigured();
}

export function isGoogleCalendarConfigured(): boolean {
  return isGoogleOAuthConfigured();
}

export function getGoogleOAuthEnvStatus(requestUrl?: string) {
  const redirectUri = getGoogleCalendarRedirectUri(requestUrl);
  const configured = isGoogleOAuthConfigured();

  return {
    configured,
    redirectUri,
    redirectUriSource: process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim()
      ? "GOOGLE_CALENDAR_REDIRECT_URI"
      : process.env.NEXT_PUBLIC_APP_URL?.trim()
        ? "NEXT_PUBLIC_APP_URL"
        : requestUrl
          ? "request origin"
          : "default localhost:3000",
  };
}
