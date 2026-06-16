import type { OnboardingQuestionnaireResponses } from "@/lib/onboarding/questionnaire-types";

export type SuggestedIntegration = {
  name: string;
  reason_es: string;
  reason_en: string;
};

export type EscalationChannel = {
  channels: ("whatsapp" | "email")[];
  whatsapp?: string;
  email?: string;
};

export function buildSuggestedStack(input: {
  ecommerce_platform?: string;
  escalation_channel?: EscalationChannel | null;
  pain_points?: string[];
}): SuggestedIntegration[] {
  const stack: SuggestedIntegration[] = [];

  stack.push({
    name: "ClickIn 360 CRM",
    reason_es: "Sistema central de gestión de clientes",
    reason_en: "Central customer management system",
  });
  stack.push({
    name: "N8N",
    reason_es: "Automatización de flujos de trabajo",
    reason_en: "Workflow automation",
  });
  stack.push({
    name: "OpenAI / Claude",
    reason_es: "Agente de IA para calificación de leads",
    reason_en: "AI agent for lead qualification",
  });

  if (input.ecommerce_platform === "shopify" || input.ecommerce_platform?.toLowerCase() === "shopify") {
    stack.push({
      name: "Shopify",
      reason_es: "Plataforma de comercio electrónico",
      reason_en: "eCommerce platform",
    });
  }
  if (input.ecommerce_platform === "woocommerce" || input.ecommerce_platform?.toLowerCase() === "woocommerce") {
    stack.push({
      name: "WooCommerce",
      reason_es: "Plataforma de comercio electrónico",
      reason_en: "eCommerce platform",
    });
  }

  if (input.escalation_channel?.channels?.includes("whatsapp")) {
    stack.push({
      name: "WhatsApp Business API",
      reason_es: "Canal de comunicación principal",
      reason_en: "Primary communication channel",
    });
  }
  if (input.escalation_channel?.channels?.includes("email")) {
    stack.push({
      name: "Mailgun",
      reason_es: "Correos transaccionales automatizados",
      reason_en: "Automated transactional emails",
    });
  }

  const pains = input.pain_points ?? [];
  if (pains.includes("logistics") || pains.includes("shipping")) {
    stack.push({
      name: "Envia.com",
      reason_es: "Gestión de envíos y logística",
      reason_en: "Shipping and logistics management",
    });
  }
  if (pains.includes("payments")) {
    stack.push({
      name: "Stripe",
      reason_es: "Procesamiento de pagos",
      reason_en: "Payment processing",
    });
  }

  return stack;
}

export function mapQuestionnaireToOnboardingRow(input: {
  contactId: string;
  opportunityId?: string | null;
  onboardingToken: string;
  preferredLanguage?: string | null;
  responses: OnboardingQuestionnaireResponses;
  escalationChannel?: EscalationChannel | null;
  suggestedIntegrations?: SuggestedIntegration[];
  websiteUrl?: string | null;
  brandColors?: string | null;
  logoStoragePath?: string | null;
  additionalNotes?: string | null;
}) {
  const { responses: r } = input;
  return {
    contact_id: input.contactId,
    opportunity_id: input.opportunityId ?? null,
    onboarding_token: input.onboardingToken,
    business_name: r.project.company?.trim() || null,
    website_url: input.websiteUrl?.trim() || null,
    ecommerce_platform: r.ecommerce.platform?.trim() || null,
    whatsapp_number: r.project.whatsapp?.trim() || null,
    technical_contact_name: r.contacts.technical.name?.trim() || null,
    technical_contact_email: r.contacts.technical.email?.trim() || null,
    pain_points: r.goals?.length ? r.goals : null,
    existing_tools: r.integrations.other?.trim() || r.integrations.confirmed?.join(", ") || null,
    logo_storage_path: input.logoStoragePath ?? null,
    brand_colors: input.brandColors?.trim() || null,
    preferred_language: input.preferredLanguage ?? null,
    escalation_channel: input.escalationChannel ?? null,
    suggested_integrations: input.suggestedIntegrations ?? null,
    additional_notes: input.additionalNotes?.trim() || r.knowledge_base.location?.trim() || null,
  };
}
