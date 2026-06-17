/** Shared with n8n "Parse Appointment Event" Code node — keep in sync. */
export function parseAppointmentWebhook(root: Record<string, unknown>) {
  const body = (root.body as Record<string, unknown> | undefined) ?? root;
  const event = (body.event as string | undefined) ?? (root.event as string | undefined);
  const payload = (body.payload as Record<string, unknown> | undefined) ??
    (root.payload as Record<string, unknown> | undefined) ??
    {};
  const ev = (payload.calendar_event as Record<string, unknown> | undefined) ?? {};
  const contact = (payload.contact as Record<string, unknown> | undefined) ??
    (ev.contact as Record<string, unknown> | undefined) ??
    {};
  const start = (ev.start_time as string | undefined) ?? (ev.start_at as string | undefined);
  const locale = contact.preferred_language === "en" ? "en" : "es";
  const additional_contacts = Array.isArray(payload.additional_contacts)
    ? payload.additional_contacts
    : [];
  const meet_link =
    (ev.meet_link as string | null | undefined) ??
    (ev.google_meet_link as string | null | undefined) ??
    (ev.location_type === "google_meet" ? (ev.location as string | null) : null) ??
    null;

  return {
    event,
    workspace_owner_id:
      (body.workspace_owner_id as string | undefined) ??
      (root.workspace_owner_id as string | undefined),
    event_id: String(ev.id ?? payload.calendar_event_id ?? ""),
    contact_id: String(ev.contact_id ?? contact.id ?? ""),
    start_time: start,
    meet_link,
    location_type: (ev.location_type as string | undefined) ?? "other",
    location_details:
      ev.location_type === "google_meet"
        ? null
        : ((ev.location as string | undefined) ??
          (ev.location_details as string | undefined) ??
          null),
    contact_email:
      (contact.email as string | undefined) ??
      (ev.contact_email as string | undefined) ??
      null,
    contact_phone:
      (contact.phone as string | undefined) ??
      (ev.contact_phone as string | undefined) ??
      null,
    contact_name:
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
      (ev.contact_name as string | undefined) ||
      "there",
    locale,
    additional_contacts,
    title: (ev.title as string | undefined) ?? "Appointment",
  };
}

export function normalizeAppointmentStartTime(raw: string | null | undefined): string {
  if (!raw) {
    throw new Error("Missing start_time — check Parse Appointment Event output");
  }
  const value = String(raw).trim();
  if (!value) {
    throw new Error("Missing start_time — check Parse Appointment Event output");
  }
  let iso = value;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) {
    iso = `${iso}Z`;
  }
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Invalid start_time: ${raw}`);
  }
  return iso;
}

export function calculateReminderTimes(d: { start_time?: string | null }) {
  const iso = normalizeAppointmentStartTime(d.start_time);
  const start = new Date(iso);
  const now = new Date();
  const h24 = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const h1 = new Date(start.getTime() - 60 * 60 * 1000);
  return {
    reminder_24h_at: h24.toISOString(),
    reminder_1h_at: h1.toISOString(),
    skip24: h24 <= now,
    skip1: h1 <= now,
    status: h24 <= now && h1 <= now ? "skipped" : "scheduled",
    start_time: iso,
  };
}
