import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  getGoogleGmailConnection,
  isGoogleGmailConfigured,
} from "@/lib/google/gmail";
import { getGoogleGmailRedirectUri } from "@/lib/google/oauth-config";

/** Gmail / Workspace connection status for the signed-in user (per-user mailbox). */
export async function GET(req: Request) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const redirectUri = getGoogleGmailRedirectUri(req.url);
    const configured = isGoogleGmailConfigured();

    if (!configured) {
      return NextResponse.json({
        connected: false,
        configured: false,
        redirect_uri: redirectUri,
        email: null,
        read_access: false,
        per_user: true,
      });
    }

    const connection = await getGoogleGmailConnection(userId!);

    return NextResponse.json({
      connected: connection.connected,
      configured: true,
      redirect_uri: redirectUri,
      email: connection.email,
      read_access: connection.read_access,
      per_user: true,
      setup_path: "/api/integrations/google-workspace/setup",
    });
  } catch (err) {
    console.error("GET gmail status:", err);
    return NextResponse.json({
      connected: false,
      configured: false,
      email: null,
      read_access: false,
    });
  }
}
