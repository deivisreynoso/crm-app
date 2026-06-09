import {
  getMailgunApiBase,
  getMailgunApiKey,
  getMailgunDomain,
  getMailgunFrom,
  isMailgunConfigured,
} from "@/lib/email/mailgun-config";
import type { SendEmailOptions } from "@/lib/email/send";

export type MailgunSendResult = {
  id: string;
  message: string;
};

export async function sendMailgunEmail(
  options: SendEmailOptions
): Promise<MailgunSendResult> {
  if (!isMailgunConfigured()) {
    throw new Error(
      "Mailgun is not configured. Set MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM."
    );
  }

  const apiKey = getMailgunApiKey()!;
  const domain = getMailgunDomain()!;
  const from = getMailgunFrom()!;
  const url = `${getMailgunApiBase()}/v3/${encodeURIComponent(domain)}/messages`;

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", options.to);
  body.set("subject", options.subject);
  body.set("html", options.html);
  body.set(
    "text",
    options.text ?? options.html.replace(/<[^>]+>/g, "").trim()
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    const detail = payload.message || payload.error || res.statusText;
    throw new Error(`Mailgun send failed (${res.status}): ${detail}`);
  }

  return {
    id: payload.id ?? "",
    message: payload.message ?? "Queued",
  };
}
