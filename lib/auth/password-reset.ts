import { passwordResetCallbackUrl } from "@/lib/auth/app-url";

/** App callback URL for Supabase recovery redirects (must be allow-listed in Supabase Auth). */
export function buildPasswordResetRedirectTo(requestUrl?: string): string {
  return passwordResetCallbackUrl(requestUrl);
}

/** Link that opens /auth/callback with token_hash — works cross-device (no PKCE verifier). */
export function buildPasswordResetLinkWithTokenHash(
  tokenHash: string,
  requestUrl?: string
): string {
  const url = new URL(buildPasswordResetRedirectTo(requestUrl));
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "recovery");
  return url.toString();
}
