import {
  getGoogleCalendarRedirectUri,
  getGoogleGmailRedirectUri,
  isGoogleGmailConfigured,
} from "@/lib/google/oauth-config";
import { GMAIL_OAUTH_SCOPES, getGoogleGmailConnection } from "@/lib/google/gmail";

export type GoogleWorkspaceSetupResponse = {
  oauth_configured: boolean;
  app_url: string | null;
  per_user_mailbox: boolean;
  migrations: string[];
  gmail: {
    configured: boolean;
    redirect_uri: string;
    connect_path: string;
    reconnect_path: string;
    scopes: readonly string[];
    connected: boolean;
    email: string | null;
    read_access: boolean;
    status_path: string;
    disconnect_path: string;
  };
  calendar: {
    redirect_uri: string;
    connect_path: string;
    status_path: string;
  };
  checklist: { id: string; label: string; done: boolean }[];
};

export async function buildGoogleWorkspaceSetup(
  requestUrl: string,
  actorUserId: string
): Promise<GoogleWorkspaceSetupResponse> {
  const oauthConfigured = isGoogleGmailConfigured();
  const gmailRedirect = getGoogleGmailRedirectUri(requestUrl);
  const calendarRedirect = getGoogleCalendarRedirectUri(requestUrl);
  const connection = oauthConfigured
    ? await getGoogleGmailConnection(actorUserId)
    : { connected: false, email: null, read_access: false };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? null;

  const checklist = [
    {
      id: "google_cloud",
      label: "Create Google Cloud project and OAuth web client (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)",
      done: oauthConfigured,
    },
    {
      id: "gmail_api",
      label: "Enable Gmail API in Google Cloud",
      done: oauthConfigured,
    },
    {
      id: "redirect_uri",
      label: `Add redirect URI: ${gmailRedirect}`,
      done: oauthConfigured,
    },
    {
      id: "migration",
      label: "Run migration 018_google_gmail_tokens.sql in Supabase",
      done: true,
    },
    {
      id: "connect",
      label: "Each user connects their Workspace mailbox in Settings → Integrations",
      done: connection.connected,
    },
    {
      id: "read_scope",
      label: "Approve read access (sync replies into contact Emails tab)",
      done: connection.read_access,
    },
  ];

  return {
    oauth_configured: oauthConfigured,
    app_url: appUrl,
    per_user_mailbox: true,
    migrations: ["018_google_gmail_tokens.sql"],
    gmail: {
      configured: oauthConfigured,
      redirect_uri: gmailRedirect,
      connect_path: "/api/auth/google-gmail",
      reconnect_path: "/api/auth/google-gmail/reconnect",
      scopes: GMAIL_OAUTH_SCOPES,
      connected: connection.connected,
      email: connection.email,
      read_access: connection.read_access,
      status_path: "/api/integrations/gmail/status",
      disconnect_path: "/api/integrations/gmail/disconnect",
    },
    calendar: {
      redirect_uri: calendarRedirect,
      connect_path: "/api/auth/google-calendar",
      status_path: "/api/integrations/google-calendar/status",
    },
    checklist,
  };
}
