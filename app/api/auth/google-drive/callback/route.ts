import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildAppRedirectUrl } from "@/lib/auth/app-url";
import { createServerSideClient } from "@/lib/supabase";
import { canManageWorkspace, resolveWorkspaceContext } from "@/lib/team/workspace";
import {
  getGoogleDriveRedirectUri,
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
} from "@/lib/google/oauth-config";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.redirect(buildAppRedirectUrl("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(
      buildAppRedirectUrl("/media?google_drive=error", req.url)
    );
  }

  let workspaceOwnerId = userId;
  let actorUserId = userId;
  if (stateRaw) {
    try {
      const parsed = JSON.parse(
        Buffer.from(stateRaw, "base64url").toString("utf8")
      ) as { workspaceOwnerId?: string; actorUserId?: string };
      if (parsed.workspaceOwnerId) workspaceOwnerId = parsed.workspaceOwnerId;
      if (parsed.actorUserId) actorUserId = parsed.actorUserId;
    } catch {
      /* fall back to session user */
    }
  }

  const workspace = await resolveWorkspaceContext(actorUserId);
  if (!canManageWorkspace(workspace.role, workspace.isWorkspaceOwner)) {
    return NextResponse.redirect(
      buildAppRedirectUrl("/media?google_drive=forbidden", req.url)
    );
  }

  workspaceOwnerId = workspace.workspaceOwnerId;

  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  const redirectUri = getGoogleDriveRedirectUri(req.url);

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      buildAppRedirectUrl("/media?google_drive=error", req.url)
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
      buildAppRedirectUrl("/media?google_drive=error", req.url)
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

  const { error: dbError } = await supabase.from("google_drive_tokens").upsert(
    {
      user_id: workspaceOwnerId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      email_address: emailAddress,
      connected_by: actorUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (dbError) {
    console.error("Drive token save failed:", dbError.message);
    const reason = /does not exist|relation/i.test(dbError.message)
      ? "migration"
      : "storage";
    return NextResponse.redirect(
      buildAppRedirectUrl(`/media?google_drive=error&reason=${reason}`, req.url)
    );
  }

  return NextResponse.redirect(
    buildAppRedirectUrl("/media?google_drive=connected", req.url)
  );
}
