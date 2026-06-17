/** Inlined into n8n Code nodes — keep in sync with appointment-email-templates.ts */
function normalizeStart(raw) {
  if (!raw) return null;
  let iso = String(raw).trim();
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) iso += 'Z';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatSlot(d, locale) {
  return d.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', {
    weekday: 'long',
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function meetBlock(d) {
  if (d.meet_link) {
    return d.locale === 'es'
      ? '\n🔗 Enlace de reunión\n' + d.meet_link + '\n\nHaz clic unos minutos antes de la hora programada.'
      : '\n🔗 Meeting link\n' + d.meet_link + '\n\nClick the link a few minutes before your scheduled time.';
  }
  return d.locale === 'es'
    ? '\n🔗 Enlace de reunión\nTe enviaremos el enlace de Google Meet antes de la cita.'
    : '\n🔗 Meeting link\nWe will send your Google Meet link before the appointment.';
}

function changeBlock(d) {
  if (d.locale === 'es') {
    return '\n¿Necesitas hacer un cambio?\nReprogramar → ' + d.reschedule_link + '\nCancelar → ' + d.cancel_link;
  }
  return '\nNeed to make a change?\nReschedule → ' + d.reschedule_link + '\nCancel → ' + d.cancel_link;
}

function footer(d) {
  return [d.agent_name, d.company_name + ' Team', [d.support_phone, d.support_email, d.website].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
}

function emailContextFromItem(item) {
  const base = (item.crm_base_url || 'https://www.clickin360.com').replace(/\/$/, '');
  const lang = item.locale === 'en' ? 'en' : 'es';
  const start = normalizeStart(item.start_time);
  const slot_label = start ? formatSlot(start, item.locale) : String(item.start_time || '');
  const reschedule_link = item.reschedule_link || (base + '/' + lang + '/book-call?reschedule=1');
  const cancel_link = item.cancel_link || ('mailto:' + (item.support_email || 'support@clickin360.com') + '?subject=' + encodeURIComponent('Cancel appointment ' + (item.event_id || '')));
  return {
    contact_name: item.contact_name || 'there',
    company_name: item.company_name || 'ClickIn 360',
    agent_name: item.agent_name || 'ClickIn 360 Team',
    locale: item.locale === 'en' ? 'en' : 'es',
    title: item.title || 'Appointment',
    slot_label,
    timezone_label: item.timezone_label || 'CST',
    meet_link: item.meet_link || null,
    reschedule_link,
    cancel_link,
    support_email: item.support_email || 'support@clickin360.com',
    support_phone: item.support_phone || '',
    website: item.website || base,
  };
}

function buildConfirmationEmail(d) {
  const name = d.contact_name;
  if (d.locale === 'es') {
    return {
      subject: '✅ Tu cita con ' + d.company_name + ' está confirmada',
      text: 'Hola ' + name + ',\n\n¡Buenas noticias! Tu cita con ' + d.company_name + ' está confirmada. ¡Te esperamos!\n\nDetalles de la cita\n📅 Fecha y hora\n' + d.slot_label + '\n(' + d.timezone_label + ')' + meetBlock(d) + changeBlock(d) + '\n\nSi tienes preguntas antes de la reunión, responde a este correo.\n\n¡Nos vemos pronto!\nSaludos cordiales,\n' + footer(d),
    };
  }
  return {
    subject: '✅ Your appointment with ' + d.company_name + ' is confirmed!',
    text: 'Hi ' + name + ',\n\nGreat news — your appointment with ' + d.company_name + ' is officially confirmed! We\'re looking forward to connecting with you.\n\nAppointment Details\n📅 Date & time\n' + d.slot_label + '\n(' + d.timezone_label + ')' + meetBlock(d) + changeBlock(d) + '\n\nIf you have any questions before we meet, feel free to reply to this email.\n\nWe look forward to speaking with you!\nWarm regards,\n' + footer(d),
  };
}

function build24hEmail(d) {
  const name = d.contact_name;
  if (d.locale === 'es') {
    return {
      subject: '⏰ Tu cita con ' + d.company_name + ' es mañana',
      text: 'Hola ' + name + ',\n\nRecordatorio amistoso: tu cita con ' + d.company_name + ' es mañana.\n\nCita de mañana\n📅 Fecha\nMañana — ' + d.slot_label + '\n🕐 Zona horaria\n' + d.timezone_label + meetBlock(d) + '\n\nConsejos rápidos\n• Ten tus preguntas listas.\n• Prueba audio y video.\n• Únete 2–3 minutos antes.' + changeBlock(d) + '\n\n¡Nos vemos mañana!\n' + footer(d),
    };
  }
  return {
    subject: '⏰ Your ' + d.company_name + ' appointment is tomorrow',
    text: 'Hi ' + name + ',\n\nJust a friendly heads-up: your appointment with ' + d.company_name + ' is coming up tomorrow.\n\nTomorrow\'s Appointment\n📅 Date\nTomorrow — ' + d.slot_label + '\n🕐 Timezone\n' + d.timezone_label + meetBlock(d) + '\n\nQuick prep tips\n• Have questions ready.\n• Test audio/video.\n• Join 2–3 minutes early.' + changeBlock(d) + '\n\nSee you tomorrow!\n' + footer(d),
  };
}

function build1hEmail(d) {
  const name = d.contact_name;
  const join = d.meet_link || (d.locale === 'es' ? 'Revisa tu correo de confirmación para el enlace.' : 'Check your confirmation email for the link.');
  if (d.locale === 'es') {
    return {
      subject: '🔔 En 1 hora: tu cita con ' + d.company_name,
      text: 'Hola ' + name + ',\n\nTu cita con ' + d.company_name + ' comienza en una hora.\n\n🕐 Hora\n' + d.slot_label + ' (' + d.timezone_label + ')\n🔗 Únete ahora\n' + join + changeBlock(d) + '\n\n¡Nos vemos muy pronto!\n' + footer(d),
    };
  }
  return {
    subject: '🔔 Starting in 1 hour: your ' + d.company_name + ' appointment',
    text: 'Hi ' + name + ',\n\nYour appointment with ' + d.company_name + ' is starting in just one hour.\n\n🕐 Starts at\n' + d.slot_label + ' (' + d.timezone_label + ')\n🔗 Join now\n' + join + changeBlock(d) + '\n\nSee you very soon!\n' + footer(d),
  };
}
