import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  getGoogleDriveConnection,
  isGoogleDriveConfigured,
} from "@/lib/google/drive";
import { getGoogleDriveRedirectUri } from "@/lib/google/oauth-config";

export async function GET(req: Request) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const redirectUri = getGoogleDriveRedirectUri(req.url);
    const configured = isGoogleDriveConfigured();

    if (!configured) {
      return NextResponse.json({
        connected: false,
        configured: false,
        redirect_uri: redirectUri,
        email: null,
        workspace: true,
      });
    }

    const connection = await getGoogleDriveConnection(workspaceOwnerId!);

    return NextResponse.json({
      connected: connection.connected,
      configured: true,
      redirect_uri: redirectUri,
      email: connection.email,
      root_folder_id: connection.root_folder_id,
      workspace: true,
      connect_path: "/api/auth/google-drive",
      disconnect_path: "/api/integrations/google-drive/disconnect",
    });
  } catch (err) {
    console.error("GET google drive status:", err);
    return NextResponse.json({
      connected: false,
      configured: false,
      email: null,
    });
  }
}
