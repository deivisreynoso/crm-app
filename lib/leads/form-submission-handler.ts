import { z } from "zod";
import { createLeadFromWebsite } from "@/lib/leads/website-leads";
import {
  getBookingAvailabilityForWebsite,
  isBookingSlotAvailable,
  validateBookingSlot,
} from "@/lib/website/booking-availability";
import { getClickIn360OrgUserIdOptional } from "@/lib/org/constants";

export type FormSubmissionInput = {
  contact_info: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  qualification?: {
    platform?: string;
    friction_area?: string[] | string;
    communication_channels?: string[] | string;
    friction_point?: string;
  };
  calendar_selection?: {
    date: string;
    time: string;
    timezone?: string;
  } | null;
  source?: "form";
  language?: string;
  ga_client_id?: string | null;
};

export async function processFormSubmission(
  data: FormSubmissionInput,
  requestLang: "es" | "en"
) {
  const q = data.qualification ?? {};
  const cal = data.calendar_selection;

  if (cal?.date && cal?.time) {
    const availability = await getBookingAvailabilityForWebsite();
    const ownerId = getClickIn360OrgUserIdOptional();
    const slotCheck = ownerId
      ? await isBookingSlotAvailable(cal.date, cal.time, availability, ownerId)
      : validateBookingSlot(cal.date, cal.time, availability);
    if (!slotCheck.ok) {
      const message =
        requestLang === "es"
          ? slotCheck.code === "slot_unavailable"
            ? "Ese horario ya no está disponible. Elige otro de la lista."
            : slotCheck.code === "day_unavailable"
              ? "Ese día no está disponible. Elige un día laboral."
              : slotCheck.code === "outside_hours"
                ? `Horario no disponible. Elige entre ${availability.start_time} y ${availability.end_time}.`
                : slotCheck.code === "too_soon"
                  ? `Reserva con al menos ${availability.min_notice_hours} horas de anticipación.`
                  : slotCheck.code === "too_far"
                    ? `Elige una fecha dentro de los próximos ${availability.max_days_ahead} días.`
                    : "Fecha u hora no válida."
          : slotCheck.message;
      return {
        ok: false as const,
        status: 400,
        body: { error: message, code: slotCheck.code },
      };
    }
  }

  const result = await createLeadFromWebsite({
    source: "form",
    contact_info: data.contact_info,
    qualification: {
      platform: q.platform,
      friction_area: q.friction_area,
      communication_channels: q.communication_channels,
      friction_point: q.friction_point,
      ai_summary: cal
        ? `Requested call: ${cal.date} ${cal.time} (${cal.timezone ?? "local"})`
        : null,
    },
    calendar_selection: cal ?? null,
    ga_client_id: data.ga_client_id ?? null,
    language: requestLang,
  });

  return { ok: true as const, status: 201, body: result };
}

export const formSchema = z.object({
  contact_info: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
    company: z.string().optional(),
  }),
  qualification: z
    .object({
      platform: z.string().optional(),
      friction_area: z.union([z.array(z.string()), z.string()]).optional(),
      communication_channels: z.union([z.array(z.string()), z.string()]).optional(),
      friction_point: z.string().optional(),
    })
    .optional(),
  calendar_selection: z
    .object({
      date: z.string(),
      time: z.string(),
      timezone: z.string().optional(),
    })
    .optional(),
  source: z.literal("form").optional(),
  language: z.string().optional(),
  ga_client_id: z.string().optional(),
});
