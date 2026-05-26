import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { GMAIL_OAUTH_SCOPES } from "@/lib/google/gmail";
import { getGoogleGmailRedirectUri } from "@/lib/google/oauth-config";

/** Starts Gmail OAuth (uses same Google Cloud OAuth client as Calendar). */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getGoogleGmailRedirectUri(req.url);

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "Gmail is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

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
