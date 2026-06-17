export type AppointmentEmailData = {
  contact_name: string;
  company_name: string;
  agent_name: string;
  locale: "en" | "es";
  title: string;
  slot_label: string;
  timezone_label: string;
  meet_link?: string | null;
  reschedule_link: string;
  cancel_link: string;
  support_email?: string;
  support_phone?: string;
  website?: string;
};

function meetBlock(d: AppointmentEmailData): string {
  if (d.meet_link) {
    return d.locale === "es"
      ? `\n🔗 Enlace de reunión\n${d.meet_link}\n\nHaz clic unos minutos antes de la hora programada.`
      : `\n🔗 Meeting link\n${d.meet_link}\n\nClick the link a few minutes before your scheduled time.`;
  }
  return d.locale === "es"
    ? "\n🔗 Enlace de reunión\nTe enviaremos el enlace de Google Meet antes de la cita."
    : "\n🔗 Meeting link\nWe will send your Google Meet link before the appointment.";
}

function changeBlock(d: AppointmentEmailData): string {
  if (d.locale === "es") {
    return `\n¿Necesitas hacer un cambio?\nReprogramar → ${d.reschedule_link}\nCancelar → ${d.cancel_link}`;
  }
  return `\nNeed to make a change?\nReschedule → ${d.reschedule_link}\nCancel → ${d.cancel_link}`;
}

function footer(d: AppointmentEmailData): string {
  const parts = [
    d.agent_name,
    `${d.company_name} Team`,
    [d.support_phone, d.support_email, d.website].filter(Boolean).join(" · "),
  ].filter(Boolean);
  return parts.join("\n");
}

export function buildAppointmentConfirmationEmail(d: AppointmentEmailData): {
  subject: string;
  text: string;
} {
  const name = d.contact_name || (d.locale === "es" ? "hola" : "there");
  if (d.locale === "es") {
    return {
      subject: `✅ Tu cita con ${d.company_name} está confirmada`,
      text: `Hola ${name},

¡Buenas noticias! Tu cita con ${d.company_name} está confirmada. ¡Te esperamos!

Detalles de la cita
📅 Fecha y hora
${d.slot_label}
(${d.timezone_label})${meetBlock(d)}${changeBlock(d)}

Si tienes preguntas antes de la reunión, responde a este correo.

¡Nos vemos pronto!
Saludos cordiales,
${footer(d)}`,
    };
  }

  return {
    subject: `✅ Your appointment with ${d.company_name} is confirmed!`,
    text: `Hi ${name},

Great news — your appointment with ${d.company_name} is officially confirmed! We're looking forward to connecting with you.

Appointment Details
📅 Date & time
${d.slot_label}
(${d.timezone_label})${meetBlock(d)}${changeBlock(d)}

If you have any questions before we meet, feel free to reply to this email.

We look forward to speaking with you!
Warm regards,
${footer(d)}`,
  };
}

export function buildAppointment24hReminderEmail(d: AppointmentEmailData): {
  subject: string;
  text: string;
} {
  const name = d.contact_name || (d.locale === "es" ? "hola" : "there");
  if (d.locale === "es") {
    return {
      subject: `⏰ Tu cita con ${d.company_name} es mañana`,
      text: `Hola ${name},

Recordatorio amistoso: tu cita con ${d.company_name} es mañana.

Cita de mañana
📅 Fecha
Mañana — ${d.slot_label}
🕐 Zona horaria
${d.timezone_label}${meetBlock(d)}

Consejos rápidos
• Ten tus preguntas listas para aprovechar al máximo la llamada.
• Prueba audio y video antes de la reunión.
• Únete 2–3 minutos antes para empezar a tiempo.${changeBlock(d)}

Nota: pedimos al menos 2 horas de aviso para cancelar o reprogramar.

¡Nos vemos mañana!
${footer(d)}`,
    };
  }

  return {
    subject: `⏰ Your ${d.company_name} appointment is tomorrow`,
    text: `Hi ${name},

Just a friendly heads-up: your appointment with ${d.company_name} is coming up tomorrow.

Tomorrow's Appointment
📅 Date
Tomorrow — ${d.slot_label}
🕐 Timezone
${d.timezone_label}${meetBlock(d)}

Quick prep tips
• Have any relevant questions ready.
• Test your audio/video beforehand.
• Join 2–3 minutes early.${changeBlock(d)}

Please note: we kindly ask for at least a 2-hour notice to cancel or reschedule.

See you tomorrow!
${footer(d)}`,
  };
}

export function buildAppointment1hReminderEmail(d: AppointmentEmailData): {
  subject: string;
  text: string;
} {
  const name = d.contact_name || (d.locale === "es" ? "hola" : "there");
  if (d.locale === "es") {
    return {
      subject: `🔔 En 1 hora: tu cita con ${d.company_name}`,
      text: `Hola ${name},

Tu cita con ${d.company_name} comienza en una hora.

🕐 Hora
${d.slot_label} (${d.timezone_label})
🔗 Únete ahora
${d.meet_link || "Revisa tu correo de confirmación para el enlace de Google Meet."}${changeBlock(d)}

Nota: cancelaciones en el último minuto pueden considerarse inasistencia.

¡Nos vemos muy pronto!
${footer(d)}`,
    };
  }

  return {
    subject: `🔔 Starting in 1 hour: your ${d.company_name} appointment`,
    text: `Hi ${name},

Your appointment with ${d.company_name} is starting in just one hour.

🕐 Starts at
${d.slot_label} (${d.timezone_label})
🔗 Join now
${d.meet_link || "Check your confirmation email for the Google Meet link."}${changeBlock(d)}

Please note: last-minute cancellations within 1 hour may be subject to a no-show policy.

See you very soon!
${footer(d)}`,
  };
}
