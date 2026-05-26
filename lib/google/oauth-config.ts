/** OAuth callback path — must match a route under app/api/auth/google-calendar/callback */
export const GOOGLE_CALENDAR_CALLBACK_PATH = "/api/auth/google-calendar/callback";

/** OAuth callback path — must match a route under app/api/auth/google-gmail/callback */
export const GOOGLE_GMAIL_CALLBACK_PATH = "/api/auth/google-gmail/callback";

/**
 * Redirect URI sent to Google. Must match **exactly** an entry in Google Cloud Console
 * → APIs & Services → Credentials → OAuth client → Authorized redirect URIs.
 */
export function getGoogleCalendarRedirectUri(requestUrl?: string): string {
  const fromEnv = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;

  if (requestUrl) {
    try {
      const origin = new URL(requestUrl).origin;
      return `${origin}${GOOGLE_CALENDAR_CALLBACK_PATH}`;
    } catch {
      /* fall through */
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) return `${appUrl}${GOOGLE_CALENDAR_CALLBACK_PATH}`;

  return `http://localhost:3000${GOOGLE_CALENDAR_CALLBACK_PATH}`;
}

export function getGoogleGmailRedirectUri(requestUrl?: string): string {
  const fromEnv = process.env.GOOGLE_GMAIL_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;

  if (requestUrl) {
    try {
      const origin = new URL(requestUrl).origin;
      return `${origin}${GOOGLE_GMAIL_CALLBACK_PATH}`;
    } catch {
      /* fall through */
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) return `${appUrl}${GOOGLE_GMAIL_CALLBACK_PATH}`;

  return `http://localhost:3000${GOOGLE_GMAIL_CALLBACK_PATH}`;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isGoogleGmailConfigured(): boolean {
  return isGoogleOAuthConfigured();
}

export function getGoogleOAuthEnvStatus(requestUrl?: string) {
  const redirectUri = getGoogleCalendarRedirectUri(requestUrl);
  const configured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      (process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL ||
        requestUrl)
  );

  return {
    configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    redirectUri,
    redirectUriSource: process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim()
      ? "GOOGLE_CALENDAR_REDIRECT_URI"
      : requestUrl
        ? "request origin"
        : process.env.NEXT_PUBLIC_APP_URL
          ? "NEXT_PUBLIC_APP_URL"
          : "default localhost:3000",
  };
}
