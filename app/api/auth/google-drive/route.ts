import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { DRIVE_OAUTH_SCOPES } from "@/lib/google/drive";
import {
  getGoogleDriveRedirectUri,
  getGoogleOAuthClientId,
} from "@/lib/google/oauth-config";

/** Starts Google Drive OAuth for the workspace (owner/admin only). */
export async function GET(req: NextRequest) {
  const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } =
    await requireAuth();
  if (error) return error;

  const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
  if (manageError) return manageError;

  const clientId = getGoogleOAuthClientId();
  const redirectUri = getGoogleDriveRedirectUri(req.url);

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "Google Drive is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({
      workspaceOwnerId,
      actorUserId: userId,
    })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
