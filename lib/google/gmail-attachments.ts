import { encodeGmailRaw, escapeHeaderValue } from "@/lib/google/gmail-raw";
import {
  emailBodyPlainText,
  formatFromHeader,
  generateMessageId,
  isHtmlEmailBody,
} from "@/lib/email/html-body";

export type GmailAttachment = {
  filename: string;
  mimeType: string;
  content: Buffer;
};

function encodeUtf8Base64(text: string): string {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/(.{76})/g, "$1\r\n")
    .replace(/\r\n$/, "");
}

function buildHeaders(input: {
  to: string;
  subject: string;
  from?: string | null;
  fromName?: string | null;
  cc?: string | null;
  bcc?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
}): string[] {
  const to = escapeHeaderValue(input.to);
  const subject = escapeHeaderValue(input.subject);
  const fromEmail = input.from?.trim() ?? "";
  const from = fromEmail
    ? `From: ${escapeHeaderValue(formatFromHeader(fromEmail, input.fromName))}\r\n`
    : "";
  const cc = input.cc?.trim() ? `Cc: ${escapeHeaderValue(input.cc)}\r\n` : "";
  const bcc = input.bcc?.trim() ? `Bcc: ${escapeHeaderValue(input.bcc)}\r\n` : "";
  const inReplyTo = input.inReplyTo?.trim()
    ? `In-Reply-To: ${escapeHeaderValue(input.inReplyTo)}\r\n`
    : "";
  const references = input.references?.trim()
    ? `References: ${escapeHeaderValue(input.references)}\r\n`
    : "";
  const date = `Date: ${new Date().toUTCString()}\r\n`;
  const messageId = fromEmail
    ? `Message-ID: ${escapeHeaderValue(generateMessageId(fromEmail))}\r\n`
    : "";
  const replyTo = fromEmail ? `Reply-To: ${escapeHeaderValue(fromEmail)}\r\n` : "";

  return [
    `${from}${to ? `To: ${to}\r\n` : ""}${cc}${bcc}${replyTo}${date}${messageId}${inReplyTo}${references}Subject: ${subject}`,
    "MIME-Version: 1.0",
  ];
}

function buildAlternativeParts(body: string): { plain: string; html?: string } {
  if (isHtmlEmailBody(body)) {
    return { plain: emailBodyPlainText(body), html: body };
  }
  return { plain: body };
}

function appendAlternativeBody(lines: string[], boundary: string, body: string) {
  const { plain, html } = buildAlternativeParts(body);

  lines.push(`--${boundary}`);
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(encodeUtf8Base64(plain));

  if (html) {
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(encodeUtf8Base64(html));
  }

  lines.push(`--${boundary}--`, "");
}

function appendAttachments(lines: string[], boundary: string, attachments: GmailAttachment[]) {
  for (const att of attachments) {
    const encoded = att.content
      .toString("base64")
      .replace(/(.{76})/g, "$1\r\n")
      .replace(/\r\n$/, "");
    const safeName = att.filename.replace(/"/g, "'");
    lines.push(
      `--${boundary}`,
      `Content-Type: ${att.mimeType}; name="${safeName}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${safeName}"`,
      "",
      encoded
    );
  }
  lines.push(`--${boundary}--`, "");
}

export function buildGmailRawMessage(input: {
  to: string;
  subject: string;
  body: string;
  from?: string | null;
  fromName?: string | null;
  cc?: string | null;
  bcc?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
  attachments?: GmailAttachment[];
}): string {
  const headers = buildHeaders(input);
  const attachments = input.attachments?.filter((a) => a.content.length > 0) ?? [];

  if (attachments.length === 0) {
    const altBoundary = `alt_${Date.now().toString(36)}`;
    const lines = [...headers, `Content-Type: multipart/alternative; boundary="${altBoundary}"`, ""];
    appendAlternativeBody(lines, altBoundary, input.body);
    return encodeGmailRaw(lines.join("\r\n"));
  }

  const mixedBoundary = `mixed_${Date.now().toString(36)}`;
  const altBoundary = `alt_${Date.now().toString(36)}`;
  const lines = [...headers, `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`, ""];

  lines.push(`--${mixedBoundary}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  lines.push("");

  const altLines: string[] = [];
  appendAlternativeBody(altLines, altBoundary, input.body);
  lines.push(...altLines);

  appendAttachments(lines, mixedBoundary, attachments);
  return encodeGmailRaw(lines.join("\r\n"));
}
