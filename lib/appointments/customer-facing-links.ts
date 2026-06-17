import type { CrmLocale } from "@/lib/crm/i18n";

export type AppointmentEmailLinks = {
  reschedule_link: string;
  cancel_link: string;
};

export function buildAppointmentEmailLinks(input: {
  siteBaseUrl: string;
  locale: CrmLocale;
  eventId?: string | null;
  contactEmail?: string | null;
  supportEmail?: string | null;
}): AppointmentEmailLinks {
  const base = input.siteBaseUrl.replace(/\/$/, "");
  const lang = input.locale === "en" ? "en" : "es";
  const email = input.contactEmail?.trim();
  const reschedule = new URL(`${base}/${lang}/book-call`);
  reschedule.searchParams.set("reschedule", "1");
  if (email) reschedule.searchParams.set("email", email);

  const support = (input.supportEmail?.trim() || "support@clickin360.com").replace(
    /^mailto:/i,
    ""
  );
  const subject = encodeURIComponent(
    input.locale === "en"
      ? `Cancel appointment ${input.eventId ?? ""}`.trim()
      : `Cancelar cita ${input.eventId ?? ""}`.trim()
  );
  const cancel_link = `mailto:${support}?subject=${subject}`;

  return {
    reschedule_link: reschedule.toString(),
    cancel_link,
  };
}
