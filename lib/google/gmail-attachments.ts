import { encodeGmailRaw, escapeHeaderValue } from "@/lib/google/gmail-raw";

export type GmailAttachment = {
  filename: string;
  mimeType: string;
  content: Buffer;
};

export function buildGmailRawMessage(input: {
  to: string;
  subject: string;
  body: string;
  from?: string | null;
  attachments?: GmailAttachment[];
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

  const attachments = input.attachments?.filter((a) => a.content.length > 0) ?? [];

  if (attachments.length === 0) {
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

  const boundary = `crm_${Date.now().toString(36)}`;
  const lines: string[] = [
    `${from}To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: ${contentType}`,
    "Content-Transfer-Encoding: 7bit",
    "",
    input.body,
  ];

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
  return encodeGmailRaw(lines.join("\r\n"));
}
