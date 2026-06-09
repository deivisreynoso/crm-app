import { z } from 'zod';
import { isValidEmail, isValidPhone } from '@/lib/identity/normalize';

const optionalString = z.string().optional().or(z.literal(''));

const emailField = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((v) => isValidEmail(v), {
    message: 'Enter a valid email address (e.g. name@company.com)',
  });

const phoneField = optionalString.refine((v) => isValidPhone(v), {
  message: 'Enter a valid phone number with at least 10 digits',
});

const customFieldValuesSchema = z
  .record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  )
  .optional();

export const contactSchema = z
  .object({
    first_name: z.string().min(2, 'First name must be at least 2 characters'),
    last_name: z.string().min(2, 'Last name must be at least 2 characters'),
    email: emailField,
    phone: phoneField,
    company: optionalString,
    title: optionalString,
    source: optionalString,
    status: z.enum(['lead', 'active', 'inactive', 'prospect']),
    notes: optionalString,
    preferred_language: optionalString,
    website: optionalString,
    date_of_birth: optionalString,
    preferred_contact_method: optionalString,
    signals: optionalString,
    platform: optionalString,
    friction_area: optionalString,
    communication_channels: optionalString,
    ai_summary: optionalString,
    street_address: optionalString,
    city: optionalString,
    state: optionalString,
    postal_code: optionalString,
    country: optionalString,
    timezone: optionalString,
    tags: optionalString,
    company_id: z.string().uuid().optional().or(z.literal('')),
    custom_fields: customFieldValuesSchema,
    review_request_opt_out: z.boolean().optional(),
  })
  .refine((data) => !!(data.email?.trim() || data.phone?.trim()), {
    message: 'Email or phone is required',
    path: ['email'],
  });

/** PATCH body — no email/phone refine so single-field updates work */
export const contactPatchSchema = z.object({
  first_name: z.string().min(2).optional(),
  last_name: z.string().min(2).optional(),
  email: emailField,
  phone: phoneField,
  company: optionalString,
  title: optionalString,
  source: optionalString,
  status: z.enum(['lead', 'active', 'inactive', 'prospect']).optional(),
  notes: optionalString,
  preferred_language: optionalString,
  website: optionalString,
  date_of_birth: optionalString,
  preferred_contact_method: optionalString,
  signals: optionalString,
  platform: optionalString,
  friction_area: optionalString,
  communication_channels: optionalString,
  ai_summary: optionalString,
  street_address: optionalString,
  city: optionalString,
  state: optionalString,
  postal_code: optionalString,
  country: optionalString,
  timezone: optionalString,
  tags: optionalString,
  company_id: z.string().uuid().optional().or(z.literal('')),
  custom_fields: customFieldValuesSchema,
  review_request_opt_out: z.boolean().optional(),
});

export const noteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  activity_type: z.enum(['call', 'email', 'meeting', 'note']).default('note'),
});

export const noteUpdateSchema = z
  .object({
    content: z.string().min(1, 'Note content is required').optional(),
    activity_type: z.enum(['call', 'email', 'meeting', 'note']).optional(),
  })
  .refine((data) => data.content !== undefined || data.activity_type !== undefined, {
    message: 'At least one field is required',
  });

export type NoteFormData = z.infer<typeof noteSchema>;

export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['open', 'in_progress', 'completed']).default('open'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().optional().or(z.literal('')),
  due_at: z.string().optional().or(z.literal('')),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
});

export type TaskFormData = z.infer<typeof taskSchema>;

export type ContactFormData = z.infer<typeof contactSchema>;

export const opportunitySchema = z.object({
  contact_id: z.string().uuid('Invalid contact'),
  pipeline_id: z.string().uuid().optional().or(z.literal('')),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  value: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? undefined : Number(val),
    z.number().nonnegative().optional()
  ),
  currency: z.string().default('USD'),
  stage: z.string().min(1, 'Stage is required'),
  probability: z.coerce.number().min(0).max(100).default(50),
  expected_close_date: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
  owner_id: z.string().uuid().optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  custom_fields: customFieldValuesSchema,
});

export type OpportunityFormData = z.infer<typeof opportunitySchema>;

export const pipelineStageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().min(0),
});

export const pipelineSchema = z.object({
  name: z.string().min(2, 'Pipeline name is required'),
  stages: z.array(pipelineStageSchema).min(1, 'At least one stage is required'),
});

export type PipelineFormData = z.infer<typeof pipelineSchema>;

export const moveOpportunityStageSchema = z.object({
  stage: z.string().min(1),
});

export type MoveOpportunityStageData = z.infer<typeof moveOpportunityStageSchema>;

export const ticketSchema = z
  .object({
    contact_id: z.string().uuid("Select a contact"),
    company_id: z.string().uuid().optional().or(z.literal("")),
    subject: z.string().min(3, "Subject must be at least 3 characters"),
    title: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
    status: z
      .enum(["open", "in_progress", "closed", "on_hold"])
      .default("open"),
    priority: z
      .enum(["low", "medium", "high", "urgent"])
      .default("medium"),
    assigned_to: z.string().uuid().optional().or(z.literal("")),
    category: z.string().optional().or(z.literal("")),
    tags: z.string().optional().or(z.literal("")),
    custom_fields: customFieldValuesSchema,
  });

export type TicketFormData = z.infer<typeof ticketSchema>;

/** PATCH body — contact cannot be cleared */
export const ticketPatchSchema = z
  .object({
    contact_id: z.string().uuid().optional().or(z.literal("")),
    company_id: z.string().uuid().optional().or(z.literal("")),
    subject: z.string().min(3, "Subject must be at least 3 characters").optional(),
    title: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
    status: z
      .enum(["open", "in_progress", "closed", "on_hold"])
      .optional(),
    priority: z
      .enum(["low", "medium", "high", "urgent"])
      .optional(),
    assigned_to: z.string().uuid().optional().or(z.literal("")),
    category: z.string().optional().or(z.literal("")),
    tags: z.string().optional().or(z.literal("")),
    custom_fields: customFieldValuesSchema,
  })
  .refine(
    (data) => data.contact_id === undefined || !!data.contact_id?.trim(),
    { message: "A contact is required", path: ["contact_id"] }
  );

export type TicketPatchData = z.infer<typeof ticketPatchSchema>;

export const documentSchema = z
  .object({
    contact_id: z.string().uuid().optional().or(z.literal("")),
    company_id: z.string().uuid().optional().or(z.literal("")),
    opportunity_id: z.string().uuid().optional().or(z.literal("")),
    type: z.enum(["contract", "estimate", "proposal", "attachment"]).default("attachment"),
    title: z.string().min(1, "Title is required"),
    content: z.string().optional().or(z.literal("")),
    status: z
      .enum(["draft", "sent", "signed", "accepted", "rejected"])
      .optional(),
  })
  .refine(
    (data) =>
      !!(data.contact_id?.trim() || data.opportunity_id?.trim()),
    { message: "Link the document to a contact or opportunity", path: ["contact_id"] }
  );

export type DocumentFormData = z.infer<typeof documentSchema>;

/** Create without requiring a linked record (draft workspace). */
export const documentCreateSchema = z.object({
  contact_id: z.string().uuid().optional().or(z.literal("")),
  company_id: z.string().uuid().optional().or(z.literal("")),
  opportunity_id: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(["contract", "estimate", "proposal", "attachment"]).default("estimate"),
  title: z.string().min(1, "Title is required"),
  content: z.string().optional().or(z.literal("")),
  status: z
    .enum(["draft", "sent", "signed", "accepted", "rejected"])
    .optional(),
});

export const documentPatchSchema = z.object({
  contact_id: z.string().uuid().optional().or(z.literal("")),
  company_id: z.string().uuid().optional().or(z.literal("")),
  opportunity_id: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(["contract", "estimate", "proposal", "attachment"]).optional(),
  title: z.string().min(1).optional(),
  content: z.string().optional().or(z.literal("")),
  status: z
    .enum(["draft", "sent", "signed", "accepted", "rejected"])
    .optional(),
  valid_until: z.string().optional().or(z.literal("")),
  subtotal: z.coerce.number().nonnegative().optional(),
  tax_rate: z.coerce.number().min(0).max(100).optional(),
  tax_amount: z.coerce.number().nonnegative().optional(),
  total_amount: z.coerce.number().nonnegative().optional(),
  header_html: z.string().optional().or(z.literal("")),
  footer_html: z.string().optional().or(z.literal("")),
});

export const quoteLineItemInputSchema = z.object({
  service_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  sort_order: z.coerce.number().int().optional(),
});

export const quoteLineItemsPutSchema = z.object({
  tax_rate: z.coerce.number().min(0).max(100).optional().default(0),
  line_items: z.array(quoteLineItemInputSchema),
});

export const documentTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  type: z.enum(["contract", "estimate", "proposal", "attachment"]).optional(),
  content: z.string().optional().or(z.literal("")),
});

export const customFieldSchema = z.object({
  entity_type: z.enum(["contact", "opportunity", "ticket"]),
  field_name: z.string().min(1).max(64),
  field_type: z.enum([
    "text",
    "number",
    "date",
    "select",
    "multiselect",
    "checkbox",
    "currency",
  ]),
  is_required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  validation: z.record(z.string(), z.unknown()).optional(),
  display_order: z.number().int().min(0).optional(),
  placeholder: optionalString,
  description: z.string().max(200).optional().or(z.literal("")),
});

export type CustomFieldFormData = z.infer<typeof customFieldSchema>;

export const calendarEventSchema = z
  .object({
    contact_id: z.string().uuid("Select a contact"),
    company_id: z.string().uuid().optional().or(z.literal("")),
    opportunity_id: z.string().uuid().optional().or(z.literal("")),
    title: z.string().min(1),
    description: z.string().optional().or(z.literal("")),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
    location: z.string().optional().or(z.literal("")),
    location_type: z
      .enum(["physical", "zoom", "google_meet", "teams", "other"])
      .optional(),
  })
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: "End time must be after start time",
    path: ["end_time"],
  });

export type CalendarEventFormData = z.infer<typeof calendarEventSchema>;

export const calendarEventPatchSchema = z
  .object({
    contact_id: z.string().uuid().optional().or(z.literal("")),
    company_id: z.string().uuid().optional().or(z.literal("")),
    opportunity_id: z.string().uuid().optional().or(z.literal("")),
    title: z.string().min(1).optional(),
    description: z.string().optional().or(z.literal("")),
    start_time: z.string().min(1).optional(),
    end_time: z.string().min(1).optional(),
    location: z.string().optional().or(z.literal("")),
    location_type: z
      .enum(["physical", "zoom", "google_meet", "teams", "other"])
      .optional(),
  })
  .refine(
    (data) => {
      if (data.contact_id === undefined) return true;
      return !!data.contact_id?.trim();
    },
    {
      message: "A contact is required for this event.",
      path: ["contact_id"],
    }
  );

// Login/Register validators
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const savedFilterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  entity_type: z.enum(["contact", "opportunity", "ticket", "account"]),
  filter_config: z.record(z.string(), z.unknown()).default({}),
});

export type SavedFilterFormData = z.infer<typeof savedFilterSchema>;

export const contactTagSchema = z.object({
  name: z.string().min(1).max(48),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #1b318b")
    .optional(),
});

export type ContactTagFormData = z.infer<typeof contactTagSchema>;

export const emailTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.string().optional().or(z.literal("")),
  is_default: z.boolean().optional(),
});

export type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;

export const gmailSendSchema = z
  .object({
    to: z.string().email("Enter a valid recipient email"),
    cc: z.string().max(2000).optional().or(z.literal("")),
    subject: z.string().max(998).optional().or(z.literal("")),
    body: z.string().max(100_000).optional().or(z.literal("")),
    template_id: z.string().uuid().optional(),
    reply_to_gmail_message_id: z.string().min(1).optional(),
  })
  .refine(
    (data) =>
      data.template_id ||
      (Boolean(data.subject?.trim()) && Boolean(data.body?.trim())),
    {
      message: "Subject and message are required (or choose a template)",
      path: ["body"],
    }
  );

export type GmailSendInput = z.infer<typeof gmailSendSchema>;

export const documentSendViaGmailSchema = z.object({
  to: z.string().email("Enter a valid recipient email").optional(),
  subject: z.string().max(998).optional().or(z.literal("")),
  body: z.string().max(100_000).optional().or(z.literal("")),
});

export type DocumentSendViaGmailInput = z.infer<typeof documentSendViaGmailSchema>;

export const notificationPreferencesSchema = z.object({
  task_reminders: z.boolean().optional(),
  opportunity_reminders: z.boolean().optional(),
  ticket_notifications: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  email_frequency: z.enum(["instant", "daily", "weekly", "off"]).optional(),
  timezone: z.string().optional().or(z.literal("")),
});

export type NotificationPreferencesFormData = z.infer<
  typeof notificationPreferencesSchema
>;