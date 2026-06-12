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

export function appointmentConfirmationEmail(input: {
  locale: CrmLocale;
  name: string;
  slotLabel: string;
  timezone: string;
  meetLink?: string | null;
  reschedule?: boolean;
}): { subject: string; html: string; text: string } {
  const locale = input.locale === "es" ? "es" : "en";
  const greeting = input.name.trim() || (locale === "es" ? "hola" : "there");
  const meetBlock = input.meetLink
    ? locale === "es"
      ? `\n\nÚnete con Google Meet:\n${input.meetLink}`
      : `\n\nJoin with Google Meet:\n${input.meetLink}`
    : "";

  const meetHtml = input.meetLink
    ? `<p><strong>${locale === "es" ? "Google Meet" : "Google Meet"}:</strong> <a href="${input.meetLink}">${input.meetLink}</a></p>`
    : `<p>${locale === "es" ? "Te enviaremos el enlace de videollamada antes de la cita." : "We will send your video call link before the appointment."}</p>`;

  if (locale === "es") {
    const subject = input.reschedule
      ? "Tu cita fue reprogramada — ClickIn 360"
      : "Confirmación de tu cita — ClickIn 360";
    const text = `Hola ${greeting},

${input.reschedule ? "Reprogramamos" : "Confirmamos"} tu llamada de descubrimiento:

${input.slotLabel}
(${input.timezone.replace(/_/g, " ")})${meetBlock}

Si necesitas cambiar la cita, responde a este correo o contáctanos por el chat del sitio.

— ClickIn 360`;

    const html = layout(`
  <p>Hola ${greeting},</p>
  <p>${input.reschedule ? "Reprogramamos" : "Confirmamos"} tu llamada de descubrimiento:</p>
  <p><strong>${input.slotLabel}</strong><br/>
  <span style="color:#666">${input.timezone.replace(/_/g, " ")}</span></p>
  ${meetHtml}
  <p>Si necesitas cambiar la cita, responde a este correo o contáctanos por el chat del sitio.</p>
  <p>— ClickIn 360</p>
`);

    return { subject, html, text };
  }

  const subject = input.reschedule
    ? "Your appointment was rescheduled — ClickIn 360"
    : "Appointment confirmed — ClickIn 360";
  const text = `Hi ${greeting},

${input.reschedule ? "We rescheduled" : "This confirms"} your discovery call:

${input.slotLabel}
(${input.timezone.replace(/_/g, " ")})${meetBlock}

Need to change the time? Reply to this email or use the chat on our website.

— ClickIn 360`;

  const html = layout(`
  <p>Hi ${greeting},</p>
  <p>${input.reschedule ? "We rescheduled" : "This confirms"} your discovery call:</p>
  <p><strong>${input.slotLabel}</strong><br/>
  <span style="color:#666">${input.timezone.replace(/_/g, " ")}</span></p>
  ${meetHtml}
  <p>Need to change the time? Reply to this email or use the chat on our website.</p>
  <p>— ClickIn 360</p>
`);

  return { subject, html, text };
}
