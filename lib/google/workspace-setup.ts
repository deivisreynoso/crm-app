import { createServerSideClient } from "@/lib/supabase";
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
    connected: boolean;
  };
  checklist: { id: string; label: string; done: boolean }[];
};

async function getCalendarConnected(actorUserId: string): Promise<boolean> {
  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("google_calendar_tokens")
    .select("id")
    .eq("user_id", actorUserId)
    .maybeSingle();
  return !!data?.id;
}

export async function buildGoogleWorkspaceSetup(
  requestUrl: string,
  actorUserId: string
): Promise<GoogleWorkspaceSetupResponse> {
  const oauthConfigured = isGoogleGmailConfigured();
  const gmailRedirect = getGoogleGmailRedirectUri(requestUrl);
  const calendarRedirect = getGoogleCalendarRedirectUri(requestUrl);
  const connection = oauthConfigured
    ? await getGoogleGmailConnection(actorUserId, { verifyRead: false })
    : { connected: false, email: null, read_access: false };
  const calendarConnected = oauthConfigured
    ? await getCalendarConnected(actorUserId)
    : false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? null;

  const checklist = [
    {
      id: "google_cloud",
      label:
        "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your server environment",
      done: oauthConfigured,
    },
    {
      id: "gmail_api",
      label: "Enable Gmail API and Google Calendar API in Google Cloud",
      done: oauthConfigured,
    },
    {
      id: "redirect_gmail",
      label: `Register Gmail redirect URI: ${gmailRedirect}`,
      done: oauthConfigured,
    },
    {
      id: "redirect_calendar",
      label: `Register Calendar redirect URI: ${calendarRedirect}`,
      done: oauthConfigured,
    },
    {
      id: "connect_gmail",
      label: "Connect your Workspace mailbox below",
      done: connection.connected,
    },
    {
      id: "connect_calendar",
      label: "Connect your Google Calendar below",
      done: calendarConnected,
    },
    {
      id: "read_scope",
      label: "Approve Gmail read access to sync threads on contact records",
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
      connected: calendarConnected,
    },
    checklist,
  };
}
