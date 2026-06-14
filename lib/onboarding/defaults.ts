export type OnboardingTaskTemplateItem = {
  key: string;
  title_en: string;
  title_es: string;
  description_en?: string;
  description_es?: string;
  due_days?: number;
};

export const DEFAULT_ONBOARDING_TASK_TEMPLATE: OnboardingTaskTemplateItem[] = [
  {
    key: "kickoff_call",
    title_en: "Schedule kickoff call",
    title_es: "Agendar llamada de inicio",
    description_en: "Book a 30-minute kickoff with the delivery team.",
    description_es: "Agenda una llamada de inicio de 30 minutos con el equipo.",
    due_days: 2,
  },
  {
    key: "brand_assets",
    title_en: "Share brand assets",
    title_es: "Compartir activos de marca",
    description_en: "Logo, colors, fonts, and brand guidelines.",
    description_es: "Logo, colores, tipografías y guía de marca.",
    due_days: 5,
  },
  {
    key: "platform_access",
    title_en: "Grant platform access",
    title_es: "Otorgar acceso a plataformas",
    description_en: "Shopify, ad accounts, analytics, and any required integrations.",
    description_es: "Shopify, cuentas de anuncios, analítica e integraciones necesarias.",
    due_days: 7,
  },
  {
    key: "questionnaire",
    title_en: "Complete onboarding questionnaire",
    title_es: "Completar cuestionario de onboarding",
    description_en: "Fill out the onboarding form sent by email.",
    description_es: "Completa el formulario de onboarding enviado por correo.",
    due_days: 3,
  },
  {
    key: "content_review",
    title_en: "Review deliverables checklist",
    title_es: "Revisar checklist de entregables",
    description_en: "Confirm scope, milestones, and success metrics.",
    description_es: "Confirma alcance, hitos y métricas de éxito.",
    due_days: 10,
  },
];

export type AppointmentReminderSettings = {
  enabled: boolean;
  reminders_hours_before: number[];
  email_enabled: boolean;
  whatsapp_enabled: boolean;
};

export const DEFAULT_APPOINTMENT_REMINDER_SETTINGS: AppointmentReminderSettings = {
  enabled: true,
  reminders_hours_before: [24, 2],
  email_enabled: true,
  whatsapp_enabled: false,
};

export function resolveOnboardingTaskTemplate(
  raw: unknown
): OnboardingTaskTemplateItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_ONBOARDING_TASK_TEMPLATE;
  }
  return raw as OnboardingTaskTemplateItem[];
}

export function resolveAppointmentReminderSettings(
  raw: unknown
): AppointmentReminderSettings {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_APPOINTMENT_REMINDER_SETTINGS;
  }
  const o = raw as Partial<AppointmentReminderSettings>;
  return {
    enabled: o.enabled ?? DEFAULT_APPOINTMENT_REMINDER_SETTINGS.enabled,
    reminders_hours_before:
      Array.isArray(o.reminders_hours_before) && o.reminders_hours_before.length > 0
        ? o.reminders_hours_before
        : DEFAULT_APPOINTMENT_REMINDER_SETTINGS.reminders_hours_before,
    email_enabled: o.email_enabled ?? DEFAULT_APPOINTMENT_REMINDER_SETTINGS.email_enabled,
    whatsapp_enabled:
      o.whatsapp_enabled ?? DEFAULT_APPOINTMENT_REMINDER_SETTINGS.whatsapp_enabled,
  };
}
