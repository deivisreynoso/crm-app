import { createServerSideClient } from "@/lib/supabase";
import {
  buildGmailRawMessage,
  type GmailAttachment,
} from "@/lib/google/gmail-attachments";
import {
  getGoogleGmailRedirectUri,
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  isGoogleGmailConfigured,
} from "@/lib/google/oauth-config";

export type { GmailAttachment };
export { getGoogleGmailRedirectUri, isGoogleGmailConfigured };

export const GMAIL_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

type TokenRow = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  email_address: string | null;
  has_read_access?: boolean | null;
};

/** Returns a valid access token for the connected user, refreshing when expired. */
export async function getGoogleGmailAccessToken(
  userId: string
): Promise<string | null> {
  if (!isGoogleGmailConfigured()) return null;

  const supabase = createServerSideClient();
  const { data: row, error } = await supabase
    .from("google_gmail_tokens")
    .select("access_token, refresh_token, expires_at, email_address")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !row?.access_token) return null;

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const stillValid = expiresAt > Date.now() + 60_000;

  if (stillValid) return row.access_token;

  if (!row.refresh_token) return null;

  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  if (!clientId || !clientSecret) return null;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Gmail token refresh failed:", await tokenRes.text());
    return null;
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const newExpires = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("google_gmail_tokens")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? row.refresh_token,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return tokens.access_token;
}

export async function getGoogleGmailConnection(
  userId: string,
  options?: { verifyRead?: boolean }
): Promise<{
  connected: boolean;
  email: string | null;
  read_access: boolean;
}> {
  if (!isGoogleGmailConfigured()) {
    return { connected: false, email: null, read_access: false };
  }

  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("google_gmail_tokens")
    .select("id, email_address, has_read_access")
    .eq("user_id", userId)
    .maybeSingle();

  const connected = !!data?.id;
  if (!connected) {
    return { connected: false, email: null, read_access: false };
  }

  const email =
    data?.email_address?.trim() || (await getGoogleGmailConnectedEmail(userId));

  let read_access = data?.has_read_access === true;
  if (options?.verifyRead) {
    read_access = await checkGmailReadAccess(userId);
    await supabase
      .from("google_gmail_tokens")
      .update({
        has_read_access: read_access,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  return { connected: true, email, read_access };
}

/** True when the stored token can list messages (gmail.readonly scope). */
export async function checkGmailReadAccess(userId: string): Promise<boolean> {
  const accessToken = await getGoogleGmailAccessToken(userId);
  if (!accessToken) return false;

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return res.ok;
}

export async function getGoogleGmailConnectedEmail(
  userId: string
): Promise<string | null> {
  const supabase = createServerSideClient();
  const { data } = await supabase
    .from("google_gmail_tokens")
    .select("email_address")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.email_address?.trim() || null;
}

export type GmailSendInput = {
  to: string;
  subject: string;
  body: string;
  fromName?: string | null;
  cc?: string;
  bcc?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: GmailAttachment[];
};

export type GmailSendResult = {
  messageId: string;
  threadId?: string;
};

/** Send as the connected user (Workspace or Gmail). Each CRM user connects their own mailbox. */
export async function sendGmailMessage(
  actorUserId: string,
  input: GmailSendInput
): Promise<GmailSendResult | null> {
  const accessToken = await getGoogleGmailAccessToken(actorUserId);
  if (!accessToken) return null;

  const fromEmail = await getGoogleGmailConnectedEmail(actorUserId);
  const raw = buildGmailRawMessage({
    ...input,
    from: fromEmail,
    fromName: input.fromName,
  });

  const payload: { raw: string; threadId?: string } = { raw };
  if (input.threadId) payload.threadId = input.threadId;

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    console.error("Gmail send failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as { id?: string; threadId?: string };
  if (!data.id) return null;

  return {
    messageId: data.id,
    threadId: data.threadId,
  };
}
