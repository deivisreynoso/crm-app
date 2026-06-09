import { getGoogleGmailAccessToken } from "@/lib/google/gmail";

type GmailMessageMeta = {
  threadId?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
};

function headerValue(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string
): string {
  const found = headers?.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  );
  return found?.value?.trim() ?? "";
}

/** Load thread + RFC Message-ID headers for a proper Gmail reply. */
export async function getGmailReplyContext(
  actorUserId: string,
  gmailMessageId: string
): Promise<{
  threadId?: string;
  inReplyTo?: string;
  references?: string;
} | null> {
  const accessToken = await getGoogleGmailAccessToken(actorUserId);
  if (!accessToken) return null;

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(gmailMessageId)}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References&metadataHeaders=In-Reply-To`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;

  const raw = (await res.json()) as GmailMessageMeta;
  const headers = raw.payload?.headers;
  const messageId = headerValue(headers, "Message-ID");
  const references = headerValue(headers, "References");
  const inReplyTo = headerValue(headers, "In-Reply-To");

  const refChain = [references, inReplyTo, messageId]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    threadId: raw.threadId,
    inReplyTo: messageId || inReplyTo || undefined,
    references: refChain || undefined,
  };
}
