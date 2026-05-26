import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSideClient } from "@/lib/supabase";
import { getGoogleCalendarRedirectUri } from "@/lib/google/oauth-config";
import { resolveWorkspaceContext } from "@/lib/team/workspace";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?google_calendar=error", req.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getGoogleCalendarRedirectUri(req.url);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?google_calendar=error", req.url)
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
      new URL("/settings?google_calendar=error", req.url)
    );
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const supabase = createServerSideClient();
  const { workspaceOwnerId } = await resolveWorkspaceContext(userId);

  await supabase.from("google_calendar_tokens").upsert(
    {
      user_id: workspaceOwnerId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return NextResponse.redirect(
    new URL("/settings?google_calendar=connected", req.url)
  );
}
