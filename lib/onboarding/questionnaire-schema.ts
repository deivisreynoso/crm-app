import { z } from "zod";

const contactPersonSchema = z.object({
  name: z.string(),
  email: z.string(),
  whatsapp: z.string(),
});

export const questionnaireResponsesSchema = z.object({
  project: z.object({
    company: z.string(),
    owner: z.string(),
    email: z.string(),
    whatsapp: z.string(),
    launch_date: z.string(),
    approver: z.string(),
  }),
  goals: z.array(z.string()),
  channels: z.array(z.string()),
  agent: z.object({
    name: z.string(),
    personality: z.string(),
    tone: z.string(),
    responsibilities: z.string(),
    restrictions: z.string(),
    example_response: z.string(),
  }),
  escalation: z.object({
    triggers: z.array(z.string()),
    other: z.string(),
    contact_name: z.string(),
    contact_wa: z.string(),
    contact_hours: z.string(),
  }),
  knowledge_base: z.object({
    documents: z.array(z.string()),
    location: z.string(),
  }),
  ecommerce: z.object({
    platform: z.string(),
    order_info_shared: z.array(z.string()),
  }),
  returns: z.object({
    accepted: z.string(),
    window_days: z.string(),
    refund_approver: z.string(),
    automation: z.string(),
  }),
  integrations: z.object({
    confirmed: z.array(z.string()),
    other: z.string(),
  }),
  contacts: z.object({
    technical: contactPersonSchema,
    commercial: contactPersonSchema,
  }),
  critical_dates: z.string(),
});

export const submitQuestionnaireSchema = z.object({
  responses: questionnaireResponsesSchema,
  locale: z.enum(["en", "es"]).optional(),
});
