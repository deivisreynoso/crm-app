export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Sends email when SMTP env vars are configured. */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!host || !user || !pass || !from) {
    throw new Error(
      "Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM."
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
