import { createServerSideClient } from "@/lib/supabase";

import { getGoogleGmailRedirectUri } from "@/lib/google/oauth-config";

export function isGoogleGmailConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

export { getGoogleGmailRedirectUri };

type TokenRow = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  email_address: string | null;
};

/** Returns a valid access token, refreshing when expired. */
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

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

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

function encodeGmailRaw(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function escapeHeaderValue(value: string): string {
  return value.replace(/\r?\n/g, " ").trim();
}

export function buildGmailRawMessage(input: {
  to: string;
  subject: string;
  body: string;
  from?: string | null;
}): string {
  const to = escapeHeaderValue(input.to);
  const subject = escapeHeaderValue(input.subject);
  const from = input.from?.trim()
    ? `From: ${escapeHeaderValue(input.from)}\r\n`
    : "";

  const isHtml = /<[a-z][\s\S]*>/i.test(input.body);
  const contentType = isHtml
    ? "text/html; charset=UTF-8"
    : "text/plain; charset=UTF-8";

  const raw = [
    `${from}To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: ${contentType}`,
    "",
    input.body,
  ].join("\r\n");

  return encodeGmailRaw(raw);
}

export type GmailSendResult = {
  messageId: string;
  threadId?: string;
};

export async function sendGmailMessage(
  userId: string,
  input: { to: string; subject: string; body: string }
): Promise<GmailSendResult | null> {
  const accessToken = await getGoogleGmailAccessToken(userId);
  if (!accessToken) return null;

  const fromEmail = await getGoogleGmailConnectedEmail(userId);
  const raw = buildGmailRawMessage({ ...input, from: fromEmail });

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
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
