export type OnboardingQuestionnaireResponses = {
  project: {
    company: string;
    owner: string;
    email: string;
    whatsapp: string;
    launch_date: string;
    approver: string;
  };
  goals: string[];
  channels: string[];
  agent: {
    name: string;
    personality: string;
    tone: string;
    responsibilities: string;
    restrictions: string;
    example_response: string;
  };
  escalation: {
    triggers: string[];
    other: string;
    contact_name: string;
    contact_wa: string;
    contact_hours: string;
  };
  knowledge_base: {
    documents: string[];
    location: string;
  };
  ecommerce: {
    platform: string;
    order_info_shared: string[];
  };
  returns: {
    accepted: string;
    window_days: string;
    refund_approver: string;
    automation: string;
  };
  integrations: {
    confirmed: string[];
    other: string;
  };
  contacts: {
    technical: { name: string; email: string; whatsapp: string };
    commercial: { name: string; email: string; whatsapp: string };
  };
  critical_dates: string;
};

export const DEFAULT_INTEGRATIONS = [
  "Shopify",
  "WhatsApp",
  "OpenAI",
  "N8N",
  "CRM",
  "Envia.com",
  "Database",
] as const;

export function emptyQuestionnaireResponses(): OnboardingQuestionnaireResponses {
  return {
    project: {
      company: "",
      owner: "",
      email: "",
      whatsapp: "",
      launch_date: "",
      approver: "",
    },
    goals: [],
    channels: [],
    agent: {
      name: "",
      personality: "",
      tone: "",
      responsibilities: "",
      restrictions: "",
      example_response: "",
    },
    escalation: {
      triggers: [],
      other: "",
      contact_name: "",
      contact_wa: "",
      contact_hours: "",
    },
    knowledge_base: { documents: [], location: "" },
    ecommerce: { platform: "", order_info_shared: [] },
    returns: {
      accepted: "",
      window_days: "",
      refund_approver: "",
      automation: "",
    },
    integrations: { confirmed: [...DEFAULT_INTEGRATIONS], other: "" },
    contacts: {
      technical: { name: "", email: "", whatsapp: "" },
      commercial: { name: "", email: "", whatsapp: "" },
    },
    critical_dates: "",
  };
}
