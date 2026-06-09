type GmailHeader = { name?: string; value?: string };

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};

export type ParsedGmailMessage = {
  id: string;
  threadId?: string;
  from: string;
  to: string;
  cc: string;
  replyTo: string;
  subject: string;
  body: string;
  sentAt: string;
};

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  const found = headers?.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  );
  return found?.value?.trim() ?? "";
}

function extractBody(part: GmailPart | undefined): string {
  if (!part) return "";

  if (part.body?.data) {
    try {
      return decodeBase64Url(part.body.data);
    } catch {
      return "";
    }
  }

  if (part.parts?.length) {
    const plain = part.parts.find((p) => p.mimeType === "text/plain");
    if (plain) return extractBody(plain);

    const html = part.parts.find((p) => p.mimeType === "text/html");
    if (html) {
      const raw = extractBody(html);
      return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    return part.parts.map((p) => extractBody(p)).join("\n").trim();
  }

  return "";
}

export function parseGmailApiMessage(message: {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailPart & { headers?: GmailHeader[] };
}): ParsedGmailMessage {
  const headers = message.payload?.headers;
  const from = headerValue(headers, "From");
  const to = headerValue(headers, "To");
  const cc = headerValue(headers, "Cc");
  const replyTo = headerValue(headers, "Reply-To");
  const subject = headerValue(headers, "Subject");
  const body = extractBody(message.payload) || "(No message body)";

  const sentAt = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : new Date().toISOString();

  return {
    id: message.id,
    threadId: message.threadId,
    from,
    to,
    cc,
    replyTo,
    subject,
    body,
    sentAt,
  };
}

export function emailDirection(
  from: string,
  userEmail: string,
  contactEmail: string
): "outbound" | "inbound" {
  const fromLower = from.toLowerCase();
  const userLower = userEmail.toLowerCase();
  const contactLower = contactEmail.toLowerCase();

  const bareFrom = fromLower.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] ?? fromLower;
  const bareUser =
    userLower.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] ?? userLower;

  if (bareFrom === bareUser || fromLower.includes(bareUser)) return "outbound";
  if (fromLower.includes(contactLower)) return "inbound";
  return "inbound";
}
