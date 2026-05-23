import { z } from 'zod';

const optionalString = z.string().optional().or(z.literal(''));

export const contactSchema = z
  .object({
    first_name: z.string().min(2, 'First name must be at least 2 characters'),
    last_name: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email().optional().or(z.literal('')),
    phone: optionalString,
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
    street_address: optionalString,
    city: optionalString,
    state: optionalString,
    postal_code: optionalString,
    timezone: optionalString,
    tags: optionalString,
    company_id: z.string().uuid().optional().or(z.literal('')),
  })
  .refine((data) => !!(data.email?.trim() || data.phone?.trim()), {
    message: 'Email or phone is required',
    path: ['email'],
  });

export const noteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  activity_type: z.enum(['call', 'email', 'meeting', 'note']).default('note'),
});

export type NoteFormData = z.infer<typeof noteSchema>;

export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['open', 'in_progress', 'completed']).default('open'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().optional().or(z.literal('')),
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
  company_id: z.string().uuid().optional().or(z.literal('')),
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
    contact_id: z.string().uuid().optional().or(z.literal("")),
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
  })
  .refine(
    (data) => !!(data.contact_id?.trim() || data.company_id?.trim()),
    { message: "Link the case to a contact or an account", path: ["contact_id"] }
  );

export type TicketFormData = z.infer<typeof ticketSchema>;

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
      !!(
        data.contact_id?.trim() ||
        data.company_id?.trim() ||
        data.opportunity_id?.trim()
      ),
    { message: "Link the document to an account, contact, or opportunity", path: ["contact_id"] }
  );

export type DocumentFormData = z.infer<typeof documentSchema>;

export const calendarEventSchema = z
  .object({
    contact_id: z.string().uuid().optional().or(z.literal("")),
    company_id: z.string().uuid().optional().or(z.literal("")),
    opportunity_id: z.string().uuid().optional().or(z.literal("")),
    title: z.string().min(1),
    description: z.string().optional().or(z.literal("")),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
    location: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      !!(
        data.contact_id?.trim() ||
        data.company_id?.trim() ||
        data.opportunity_id?.trim()
      ),
    { message: "Link the event to an account, contact, or opportunity", path: ["contact_id"] }
  );

export type CalendarEventFormData = z.infer<typeof calendarEventSchema>;

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