import type { OnboardingQuestionnaireResponses } from "./questionnaire-types";

export type OnboardingLocale = "en" | "es";

export type CheckboxOption = {
  value: string;
  label: Record<OnboardingLocale, string>;
};

export type SelectOption = {
  value: string;
  label: Record<OnboardingLocale, string>;
};

export const QUESTIONNAIRE_SECTION_COUNT = 6;

export const GOAL_OPTIONS: CheckboxOption[] = [
  { value: "Customer support", label: { en: "Customer support", es: "Soporte al cliente" } },
  { value: "Sales", label: { en: "Sales", es: "Ventas" } },
  { value: "Order tracking", label: { en: "Order tracking", es: "Seguimiento de pedidos" } },
  { value: "Cart recovery", label: { en: "Cart recovery", es: "Recuperación de carrito" } },
  { value: "Returns & refunds", label: { en: "Returns & refunds", es: "Devoluciones y reembolsos" } },
  { value: "Lead qualification", label: { en: "Lead qualification", es: "Calificación de leads" } },
  { value: "Post-sale support", label: { en: "Post-sale support", es: "Soporte postventa" } },
];

export const CHANNEL_OPTIONS: CheckboxOption[] = [
  { value: "WhatsApp", label: { en: "WhatsApp", es: "WhatsApp" } },
  { value: "Website chat", label: { en: "Website chat", es: "Chat web" } },
  { value: "Facebook Messenger", label: { en: "Facebook Messenger", es: "Facebook Messenger" } },
  { value: "Instagram DM", label: { en: "Instagram DM", es: "Instagram DM" } },
];

export const ESCALATION_TRIGGER_OPTIONS: CheckboxOption[] = [
  { value: "Angry or frustrated customer", label: { en: "Angry or frustrated customer", es: "Cliente molesto o frustrado" } },
  { value: "Refund or return request", label: { en: "Refund or return request", es: "Solicitud de reembolso o devolución" } },
  { value: "Payment issues", label: { en: "Payment issues", es: "Problemas de pago" } },
  { value: "Order disputes", label: { en: "Order disputes", es: "Disputas de pedido" } },
  { value: "Special or VIP cases", label: { en: "Special or VIP cases", es: "Casos especiales o VIP" } },
  { value: "Agent cannot answer", label: { en: "Agent cannot answer", es: "El agente no puede responder" } },
];

export const KB_DOCUMENT_OPTIONS: CheckboxOption[] = [
  { value: "FAQs", label: { en: "FAQs", es: "Preguntas frecuentes" } },
  { value: "Shipping policies", label: { en: "Shipping policies", es: "Políticas de envío" } },
  { value: "Return policies", label: { en: "Return policies", es: "Políticas de devolución" } },
  { value: "Warranty policies", label: { en: "Warranty policies", es: "Políticas de garantía" } },
  { value: "Product catalog", label: { en: "Product catalog", es: "Catálogo de productos" } },
  { value: "Institutional info", label: { en: "Institutional / about us", es: "Información institucional" } },
  { value: "Existing scripts", label: { en: "Existing support scripts", es: "Scripts de soporte existentes" } },
];

export const ORDER_INFO_OPTIONS: CheckboxOption[] = [
  { value: "Order status", label: { en: "Order status", es: "Estado del pedido" } },
  { value: "Tracking number", label: { en: "Tracking number", es: "Número de seguimiento" } },
  { value: "Estimated delivery", label: { en: "Estimated delivery date", es: "Fecha estimada de entrega" } },
  { value: "Purchase history", label: { en: "Purchase history", es: "Historial de compras" } },
];

export const ECOMMERCE_PLATFORM_OPTIONS: SelectOption[] = [
  { value: "", label: { en: "Select one", es: "Seleccionar" } },
  { value: "Shopify", label: { en: "Shopify", es: "Shopify" } },
  { value: "WooCommerce", label: { en: "WooCommerce", es: "WooCommerce" } },
  { value: "Tiendanube", label: { en: "Tiendanube", es: "Tiendanube" } },
  { value: "Magento", label: { en: "Magento", es: "Magento" } },
  { value: "Custom platform", label: { en: "Custom platform", es: "Plataforma personalizada" } },
  { value: "Other", label: { en: "Other", es: "Otra" } },
];

export const INTEGRATION_OPTIONS: CheckboxOption[] = [
  { value: "Shopify", label: { en: "Shopify", es: "Shopify" } },
  { value: "WhatsApp", label: { en: "WhatsApp", es: "WhatsApp" } },
  { value: "OpenAI", label: { en: "OpenAI", es: "OpenAI" } },
  { value: "N8N", label: { en: "N8N", es: "N8N" } },
  { value: "CRM", label: { en: "CRM", es: "CRM" } },
  { value: "Envia.com", label: { en: "Envia.com", es: "Envia.com" } },
  { value: "Database", label: { en: "Database", es: "Base de datos" } },
];

export const PERSONALITY_OPTIONS: SelectOption[] = [
  { value: "", label: { en: "Select one", es: "Seleccionar" } },
  { value: "Friendly", label: { en: "Friendly", es: "Amigable" } },
  { value: "Professional", label: { en: "Professional", es: "Profesional" } },
  { value: "Casual", label: { en: "Casual", es: "Informal" } },
  { value: "Premium / Luxury", label: { en: "Premium / Luxury", es: "Premium / Lujo" } },
  { value: "Technical", label: { en: "Technical", es: "Técnico" } },
  { value: "Corporate", label: { en: "Corporate", es: "Corporativo" } },
];

export const TONE_OPTIONS: SelectOption[] = [
  { value: "", label: { en: "Select one", es: "Seleccionar" } },
  { value: "Formal", label: { en: "Formal", es: "Formal" } },
  { value: "Semi-formal", label: { en: "Semi-formal", es: "Semi-formal" } },
  { value: "Casual", label: { en: "Casual", es: "Informal" } },
];

export const RETURNS_ACCEPTED_OPTIONS: SelectOption[] = [
  { value: "", label: { en: "Select one", es: "Seleccionar" } },
  { value: "Yes", label: { en: "Yes", es: "Sí" } },
  { value: "No", label: { en: "No", es: "No" } },
];

export const RETURNS_AUTOMATION_OPTIONS: SelectOption[] = [
  { value: "", label: { en: "Select one", es: "Seleccionar" } },
  { value: "Fully automated", label: { en: "Fully automated", es: "Totalmente automatizado" } },
  { value: "Automated, human approval required", label: { en: "Automated, human approval required", es: "Automatizado, requiere aprobación humana" } },
  { value: "Always requires human", label: { en: "Always requires human", es: "Siempre requiere humano" } },
];

type SectionCopy = {
  title: Record<OnboardingLocale, string>;
  subtitle: Record<OnboardingLocale, string>;
};

export const SECTION_COPY: SectionCopy[] = [
  {
    title: { en: "Project details", es: "Detalles del proyecto" },
    subtitle: {
      en: "Tell us about your business and project timeline.",
      es: "Cuéntanos sobre tu negocio y el cronograma del proyecto.",
    },
  },
  {
    title: { en: "Goals & channels", es: "Objetivos y canales" },
    subtitle: {
      en: "What should the AI agent help with, and where will it operate?",
      es: "¿En qué debe ayudar el agente de IA y dónde operará?",
    },
  },
  {
    title: { en: "Agent identity", es: "Identidad del agente" },
    subtitle: {
      en: "Define how your AI agent should sound and behave.",
      es: "Define cómo debe sonar y comportarse tu agente de IA.",
    },
  },
  {
    title: { en: "Escalation & human handoff", es: "Escalamiento y transferencia humana" },
    subtitle: {
      en: "When should conversations be handed off to a human?",
      es: "¿Cuándo deben transferirse las conversaciones a un humano?",
    },
  },
  {
    title: { en: "Knowledge base & e-commerce", es: "Base de conocimiento y e-commerce" },
    subtitle: {
      en: "What information will the agent use, and what e-commerce data can it access?",
      es: "¿Qué información usará el agente y a qué datos de e-commerce puede acceder?",
    },
  },
  {
    title: { en: "Returns & technical contact", es: "Devoluciones y contacto técnico" },
    subtitle: {
      en: "Return policies and your technical point of contact.",
      es: "Políticas de devolución y tu contacto técnico.",
    },
  },
];

export function getQuestionnaireCopy(locale: OnboardingLocale) {
  const L = locale;
  return {
    brand: "ClickIn 360",
    pageTitle: {
      en: "AI Agent onboarding",
      es: "Incorporación del agente de IA",
    }[L],
    pageSubtitle: {
      en: "Complete each section so we can configure your implementation correctly. Takes about 10 minutes.",
      es: "Completa cada sección para configurar correctamente tu implementación. Toma unos 10 minutos.",
    }[L],
    sectionLabel: (n: number, total: number) =>
      L === "en" ? `Section ${n} of ${total}` : `Sección ${n} de ${total}`,
    goalsHint: {
      en: "What should the agent accomplish? (select all that apply)",
      es: "¿Qué debe lograr el agente? (selecciona todas las que apliquen)",
    }[L],
    channelsHint: {
      en: "Which channels will the agent operate on?",
      es: "¿En qué canales operará el agente?",
    }[L],
    escalationHint: {
      en: "When should the conversation be transferred to a human agent?",
      es: "¿Cuándo debe transferirse la conversación a un agente humano?",
    }[L],
    escalationWho: {
      en: "Who receives escalated conversations?",
      es: "¿Quién recibe las conversaciones escaladas?",
    }[L],
    kbHint: {
      en: "Which documents or resources will you provide?",
      es: "¿Qué documentos o recursos proporcionarás?",
    }[L],
    orderInfoHint: {
      en: "What order info can the agent share with customers?",
      es: "¿Qué información de pedidos puede compartir el agente con los clientes?",
    }[L],
    integrationsHint: {
      en: "Confirmed integrations for this project",
      es: "Integraciones confirmadas para este proyecto",
    }[L],
    criticalDatesHint: {
      en: "We'll plan the implementation timeline around these events.",
      es: "Planificaremos el cronograma de implementación alrededor de estos eventos.",
    }[L],
    doneTitle: {
      en: "All done — here's your summary",
      es: "Listo — aquí está tu resumen",
    }[L],
    copySummary: L === "en" ? "Copy summary to clipboard" : "Copiar resumen al portapapeles",
    stepOf: (current: number, total: number) =>
      L === "en" ? `Step ${current} of ${total}` : `Paso ${current} de ${total}`,
    back: L === "en" ? "Back" : "Atrás",
    next: L === "en" ? "Next" : "Siguiente",
    finish: L === "en" ? "Finish" : "Finalizar",
    submit: L === "en" ? "Submit questionnaire" : "Enviar cuestionario",
    submitting: L === "en" ? "Submitting…" : "Enviando…",
    thanks: {
      en: "Thank you! Your onboarding questionnaire has been received. Our team will review your answers and follow up shortly.",
      es: "¡Gracias! Hemos recibido tu cuestionario de incorporación. Nuestro equipo revisará tus respuestas y te contactará pronto.",
    }[L],
    already: {
      en: "You already completed this questionnaire.",
      es: "Ya completaste este cuestionario.",
    }[L],
    invalidLink: {
      en: "This onboarding link is invalid or has expired.",
      es: "Este enlace de incorporación no es válido o ha expirado.",
    }[L],
    summaryTitle: L === "en" ? "Summary" : "Resumen",
    summarySubtitle: {
      en: "Review your answers before submitting.",
      es: "Revisa tus respuestas antes de enviar.",
    }[L],
    copyJson: L === "en" ? "Copy JSON" : "Copiar JSON",
    copied: L === "en" ? "Copied!" : "¡Copiado!",
    downloadJson: L === "en" ? "Download JSON" : "Descargar JSON",
    loading: L === "en" ? "Loading…" : "Cargando…",
    fields: {
      company: L === "en" ? "Company name" : "Nombre de la empresa",
      owner: L === "en" ? "Project owner" : "Responsable del proyecto",
      email: L === "en" ? "Email" : "Correo electrónico",
      whatsapp: L === "en" ? "WhatsApp" : "WhatsApp",
      launchDate: L === "en" ? "Target launch date" : "Fecha objetivo de lanzamiento",
      approver: L === "en" ? "Approver name" : "Nombre del aprobador",
      goals: L === "en" ? "Primary goals" : "Objetivos principales",
      channels: L === "en" ? "Channels" : "Canales",
      agentName: L === "en" ? "Agent name" : "Nombre del agente",
      personality: L === "en" ? "Personality" : "Personalidad",
      tone: L === "en" ? "Communication tone" : "Tono de comunicación",
      responsibilities: L === "en" ? "Main responsibilities" : "Responsabilidades principales",
      restrictions: L === "en" ? "What should the agent never say or promise?" : "¿Qué nunca debe decir o prometer el agente?",
      exampleResponse: L === "en" ? "Example of ideal agent response" : "Ejemplo de respuesta ideal del agente",
      escalationTriggers: L === "en" ? "Escalation triggers" : "Motivos de escalamiento",
      escalationOther: L === "en" ? "Other triggers" : "Otros motivos",
      escalationContact: L === "en" ? "Escalation contact name" : "Nombre del contacto de escalamiento",
      escalationWa: L === "en" ? "Escalation WhatsApp" : "WhatsApp de escalamiento",
      escalationHours: L === "en" ? "Available hours" : "Horario disponible",
      kbDocuments: L === "en" ? "Available documents" : "Documentos disponibles",
      kbLocation: L === "en" ? "Link or location for those documents" : "Enlace o ubicación de esos documentos",
      ecommercePlatform: L === "en" ? "E-commerce platform" : "Plataforma de e-commerce",
      orderInfo: L === "en" ? "Order info the agent can share" : "Info de pedidos que el agente puede compartir",
      returnsAccepted: L === "en" ? "Do you accept returns?" : "¿Aceptas devoluciones?",
      returnsWindow: L === "en" ? "Return window (days)" : "Ventana de devolución (días)",
      refundApprover: L === "en" ? "Who approves refunds?" : "¿Quién aprueba reembolsos?",
      returnsAutomation: L === "en" ? "Returns automation level" : "Nivel de automatización de devoluciones",
      integrations: L === "en" ? "Integrations to confirm" : "Integraciones a confirmar",
      integrationsOther: L === "en" ? "Other integrations" : "Otras integraciones",
      techContact: L === "en" ? "Technical contact" : "Contacto técnico",
      commercialContact: L === "en" ? "Commercial contact" : "Contacto comercial",
      contactName: L === "en" ? "Name" : "Nombre",
      criticalDates: L === "en" ? "Critical dates or campaigns to consider" : "Fechas críticas o campañas a considerar",
      techContactName: L === "en" ? "Technical contact name" : "Nombre del contacto técnico",
      techContactEmail: L === "en" ? "Technical email" : "Correo técnico",
      techContactWa: L === "en" ? "Technical WhatsApp" : "WhatsApp técnico",
      commercialContactName: L === "en" ? "Commercial contact name" : "Nombre del contacto comercial",
      commercialContactEmail: L === "en" ? "Commercial email" : "Correo comercial",
      commercialContactWa: L === "en" ? "Commercial WhatsApp" : "WhatsApp comercial",
    },
    placeholders: {
      responsibilities:
        L === "en"
          ? "e.g. Answer FAQs, guide customers through checkout, escalate complaints…"
          : "ej. Responder preguntas frecuentes, guiar en el checkout, escalar quejas…",
      restrictions:
        L === "en"
          ? "e.g. Do not confirm delivery dates, do not offer discounts not in the catalog…"
          : "ej. No confirmar fechas de entrega, no ofrecer descuentos fuera del catálogo…",
      exampleResponse:
        L === "en"
          ? "e.g. 'Happy to help! Let me pull up your order — could you share your order number?'"
          : "ej. '¡Con gusto te ayudo! Déjame buscar tu pedido — ¿me compartes tu número de orden?'",
      kbLocation:
        L === "en"
          ? "Google Drive URL, Dropbox, Notion, etc."
          : "URL de Google Drive, Dropbox, Notion, etc.",
      criticalDates:
        L === "en"
          ? "e.g. Hot Sale May 26–31, Black Friday Nov 28, new product launch in August…"
          : "ej. Hot Sale 26–31 mayo, Black Friday 28 nov, lanzamiento de producto en agosto…",
      integrationsOther:
        L === "en"
          ? "e.g. Klaviyo, Stripe, custom ERP…"
          : "ej. Klaviyo, Stripe, ERP personalizado…",
    },
  };
}

export function optionLabel(
  option: CheckboxOption | SelectOption,
  locale: OnboardingLocale
): string {
  return option.label[locale];
}

export function formatSummaryValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.join(", ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => {
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === "string") return v.trim().length > 0;
        return v != null && v !== "";
      })
      .map(([k, v]) => {
        if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
        return `${k}: ${v}`;
      });
    return entries.length > 0 ? entries.join(" · ") : "—";
  }
  return String(value);
}

export function summarySections(
  data: OnboardingQuestionnaireResponses,
  locale: OnboardingLocale
): { title: string; lines: string[] }[] {
  const c = getQuestionnaireCopy(locale).fields;
  return [
    {
      title: SECTION_COPY[0].title[locale],
      lines: [
        `${c.company}: ${data.project.company}`,
        `${c.owner}: ${data.project.owner}`,
        `${c.email}: ${data.project.email}`,
        `${c.whatsapp}: ${data.project.whatsapp}`,
      ],
    },
    {
      title: SECTION_COPY[1].title[locale],
      lines: [
        `${c.goals}: ${formatSummaryValue(data.goals)}`,
        `${c.channels}: ${formatSummaryValue(data.channels)}`,
      ],
    },
    {
      title: SECTION_COPY[2].title[locale],
      lines: [
        `${c.agentName}: ${data.agent.name}`,
        `${c.personality}: ${data.agent.personality}`,
        `${c.tone}: ${data.agent.tone}`,
        `${c.responsibilities}: ${data.agent.responsibilities}`,
        `${c.restrictions}: ${data.agent.restrictions}`,
      ],
    },
    {
      title: SECTION_COPY[3].title[locale],
      lines: [
        `${c.escalationTriggers}: ${formatSummaryValue(data.escalation.triggers)}`,
        `${c.escalationContact}: ${data.escalation.contact_name}`,
        `${c.escalationWa}: ${data.escalation.contact_wa}`,
        `${c.escalationHours}: ${data.escalation.contact_hours}`,
      ],
    },
    {
      title: SECTION_COPY[4].title[locale],
      lines: [
        `${c.kbDocuments}: ${formatSummaryValue(data.knowledge_base.documents)}`,
        `${c.kbLocation}: ${data.knowledge_base.location}`,
        `${c.ecommercePlatform}: ${data.ecommerce.platform}`,
        `${c.orderInfo}: ${formatSummaryValue(data.ecommerce.order_info_shared)}`,
      ],
    },
    {
      title: SECTION_COPY[5].title[locale],
      lines: [
        `${c.returnsAccepted}: ${data.returns.accepted}`,
        `${c.returnsWindow}: ${data.returns.window_days}`,
        `${c.refundApprover}: ${data.returns.refund_approver}`,
        `${c.returnsAutomation}: ${data.returns.automation}`,
        `${c.techContact}: ${formatSummaryValue(data.contacts.technical)}`,
      ],
    },
  ];
}
