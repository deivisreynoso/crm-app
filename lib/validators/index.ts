import { z } from 'zod';

export const contactSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  title: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  status: z.enum(['lead', 'active', 'inactive', 'prospect']),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const opportunitySchema = z.object({
  contact_id: z.string().uuid('Invalid contact'),
  pipeline_id: z.string().uuid().optional().or(z.literal('')),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  value: z.coerce.number().positive().optional(),
  currency: z.string().default('USD'),
  stage: z.string().min(1, 'Stage is required'),
  probability: z.coerce.number().min(0).max(100).default(50),
  expected_close_date: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type OpportunityFormData = z.infer<typeof opportunitySchema>;

export const ticketSchema = z.object({
  contact_id: z.string().uuid('Invalid contact'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['open', 'in_progress', 'closed', 'on_hold']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
});

export type TicketFormData = z.infer<typeof ticketSchema>;

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