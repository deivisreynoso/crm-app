/** Mailgun HTTP API — transactional / automated email (not Gmail compose). */

export function getMailgunApiKey(): string | undefined {
  return process.env.MAILGUN_API_KEY?.trim() || undefined;
}

export function getMailgunDomain(): string | undefined {
  return process.env.MAILGUN_DOMAIN?.trim() || undefined;
}

/** Default From for automations, e.g. no-reply@mail.clickin360.com */
export function getMailgunFrom(): string | undefined {
  return process.env.MAILGUN_FROM?.trim() || undefined;
}

/** US: https://api.mailgun.net — EU: https://api.eu.mailgun.net */
export function getMailgunApiBase(): string {
  const base = process.env.MAILGUN_API_BASE?.trim();
  if (base) return base.replace(/\/$/, "");
  return "https://api.mailgun.net";
}

export function isMailgunConfigured(): boolean {
  return Boolean(getMailgunApiKey() && getMailgunDomain() && getMailgunFrom());
}
