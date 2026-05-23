import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSideClient } from "@/lib/supabase";
import { getGoogleGmailRedirectUri } from "@/lib/google/oauth-config";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?google_gmail=error", req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getGoogleGmailRedirectUri(req.url);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?google_gmail=error", req.url)
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/settings?google_gmail=error", req.url)
    );
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  let emailAddress: string | null = null;
  try {
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as { email?: string };
      emailAddress = profile.email?.trim() || null;
    }
  } catch {
    /* optional */
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const supabase = createServerSideClient();

  const { error: dbError } = await supabase.from("google_gmail_tokens").upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      email_address: emailAddress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (dbError) {
    console.error("Gmail token save failed:", dbError.message);
    const reason =
      /does not exist|relation/i.test(dbError.message) ? "migration" : "storage";
    return NextResponse.redirect(
      new URL(`/settings?google_gmail=error&reason=${reason}`, req.url)
    );
  }

  const { checkGmailReadAccess } = await import("@/lib/google/gmail");
  const hasRead = await checkGmailReadAccess(userId);

  return NextResponse.redirect(
    new URL(
      hasRead
        ? "/settings?google_gmail=connected"
        : "/settings?google_gmail=connected_no_read",
      req.url
    )
  );
}
