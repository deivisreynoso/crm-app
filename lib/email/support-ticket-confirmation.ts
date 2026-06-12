import type { CrmLocale } from "@/lib/crm/i18n";

function layout(body: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem;margin:0 auto;padding:1.5rem">
  <p style="font-weight:600;font-size:1.125rem;margin:0 0 1rem">ClickIn 360</p>
  ${body}
  <p style="margin-top:2rem;font-size:0.75rem;color:#666">ClickIn 360 LLC</p>
</body>
</html>`;
}

const PRIORITY_LABELS: Record<CrmLocale, Record<string, string>> = {
  en: {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  },
  es: {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente",
  },
};

export function supportTicketConfirmationEmail(input: {
  locale: CrmLocale;
  name: string;
  reference: string;
  subject: string;
  priority: string;
}): { subject: string; html: string; text: string } {
  const locale = input.locale === "es" ? "es" : "en";
  const greeting = input.name.trim() || (locale === "es" ? "hola" : "there");
  const priorityLabel =
    PRIORITY_LABELS[locale][input.priority] ?? input.priority;

  if (locale === "es") {
    const text = `Hola ${greeting},

Recibimos tu solicitud de soporte ${input.reference}.

Asunto: ${input.subject}
Prioridad: ${priorityLabel}

Nuestro equipo te responderá lo antes posible.

— ClickIn 360 Soporte`;

    const html = layout(`
  <p>Hola ${greeting},</p>
  <p>Recibimos tu solicitud de soporte <strong>${input.reference}</strong>.</p>
  <p><strong>Asunto:</strong> ${input.subject}<br/>
  <strong>Prioridad:</strong> ${priorityLabel}</p>
  <p>Nuestro equipo te responderá lo antes posible.</p>
  <p>— ClickIn 360 Soporte</p>
`);

    return {
      subject: `Solicitud de soporte recibida — ${input.reference}`,
      html,
      text,
    };
  }

  const text = `Hi ${greeting},

We received your support request ${input.reference}.

Subject: ${input.subject}
Priority: ${priorityLabel}

Our team will respond as soon as possible.

— ClickIn 360 Support`;

  const html = layout(`
  <p>Hi ${greeting},</p>
  <p>We received your support request <strong>${input.reference}</strong>.</p>
  <p><strong>Subject:</strong> ${input.subject}<br/>
  <strong>Priority:</strong> ${priorityLabel}</p>
  <p>Our team will respond as soon as possible.</p>
  <p>— ClickIn 360 Support</p>
`);

  return {
    subject: `Support request received — ${input.reference}`,
    html,
    text,
  };
}

export function parseSupportLocale(value: string | null | undefined): CrmLocale {
  return value === "es" ? "es" : "en";
}
