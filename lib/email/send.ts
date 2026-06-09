import { isMailgunConfigured } from "@/lib/email/mailgun-config";
import { sendMailgunEmail } from "@/lib/email/mailgun";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() ?? user;
  return Boolean(host && user && pass && from);
}

/** True when Mailgun or legacy SMTP env vars are set. */
export function isTransactionalEmailConfigured(): boolean {
  return isMailgunConfigured() || isSmtpConfigured();
}

/**
 * Sends automated / transactional email (team invites, system notifications).
 * Prefers Mailgun when configured; falls back to SMTP (nodemailer).
 * Sales compose still uses Gmail — see lib/google/gmail.ts.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (isMailgunConfigured()) {
    await sendMailgunEmail(options);
    return;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!host || !user || !pass || !from) {
    throw new Error(
      "Email is not configured. Set MAILGUN_API_KEY, MAILGUN_DOMAIN, and MAILGUN_FROM (or SMTP_* vars)."
    );
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port: port ? Number(port) : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text ?? options.html.replace(/<[^>]+>/g, ""),
  });
}
