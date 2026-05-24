import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { revokeGoogleToken } from "@/lib/google/revoke-google-token";
import { getGoogleGmailRedirectUri } from "@/lib/google/oauth-config";

/**
 * Revokes the current Gmail grant, clears stored tokens, and starts OAuth again
 * so Google re-prompts for send + read scopes.
 */
export async function GET(req: NextRequest) {
  const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
  if (error) return error;

  const clientId = process.env.GOOGLE_CLIENT_ID;
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
    .eq("user_id", workspaceOwnerId!)
    .maybeSingle();

  const tokenToRevoke = row?.refresh_token ?? row?.access_token;
  if (tokenToRevoke) {
    await revokeGoogleToken(tokenToRevoke);
  }

  await supabase.from("google_gmail_tokens").delete().eq("user_id", workspaceOwnerId!);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
