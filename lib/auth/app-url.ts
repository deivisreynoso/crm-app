/** Public app origin for auth redirects (Supabase allow-list must include these URLs). */
export function getAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return fromEnv ?? "http://localhost:3000";
}

export function passwordResetCallbackUrl(): string {
  return `${getAppOrigin()}/auth/callback?next=/reset-password`;
}
