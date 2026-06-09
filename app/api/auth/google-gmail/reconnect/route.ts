import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { revokeGoogleToken } from "@/lib/google/revoke-google-token";
import { getGoogleGmailRedirectUri, getGoogleOAuthClientId } from "@/lib/google/oauth-config";

/**
 * Revokes the current Gmail grant, clears stored tokens, and starts OAuth again
 * so Google re-prompts for send + read scopes.
 */
export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const clientId = getGoogleOAuthClientId();
  const redirectUri = getGoogleGmailRedirectUri(req.url);

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/settings?google_gmail=error", req.url)
    );
  }

  const supabase = createServerSideClient();
  const { data: row } = await supabase
    .from("google_gmail_tokens")
    .select("refresh_token, access_token")
    .eq("user_id", userId!)
    .maybeSingle();

  const tokenToRevoke = row?.refresh_token ?? row?.access_token;
  if (tokenToRevoke) {
    await revokeGoogleToken(tokenToRevoke);
  }

  await supabase.from("google_gmail_tokens").delete().eq("user_id", userId!);

  const { GMAIL_OAUTH_SCOPES } = await import("@/lib/google/gmail");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
