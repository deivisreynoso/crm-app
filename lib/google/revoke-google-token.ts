/** Revoke a Google OAuth token so the next connect re-prompts for all scopes. */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
  } catch (err) {
    console.error("Google token revoke failed:", err);
  }
}
