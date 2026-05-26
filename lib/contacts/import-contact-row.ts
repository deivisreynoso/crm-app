import { z } from "zod";
import { isValidEmail, isValidPhone } from "@/lib/identity/normalize";
import type { ContactFormData } from "@/lib/validators";

const optionalString = z.string().optional().or(z.literal(""));

const emailField = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((v) => isValidEmail(v), { message: "Invalid email" });

const phoneField = optionalString.refine((v) => isValidPhone(v), {
  message: "Invalid phone",
});

export const contactImportRowSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: emailField,
    phone: phoneField,
    company: optionalString,
    title: optionalString,
    source: optionalString,
    status: z
      .enum(["lead", "active", "inactive", "prospect"])
      .optional()
      .default("lead"),
    notes: optionalString,
    platform: optionalString,
    friction_area: optionalString,
    communication_channels: optionalString,
    signals: optionalString,
    ai_summary: optionalString,
    tags: optionalString,
    city: optionalString,
    state: optionalString,
    country: optionalString,
    postal_code: optionalString,
    website: optionalString,
  })
  .refine((data) => !!(data.email?.trim() || data.phone?.trim()), {
    message: "Email or phone is required",
    path: ["email"],
  });

export function importRowToContactInput(
  row: z.infer<typeof contactImportRowSchema>
): ContactFormData {
  return {
    first_name: row.first_name.trim(),
    last_name: row.last_name.trim(),
    email: row.email?.trim() || undefined,
    phone: row.phone?.trim() || undefined,
    company: row.company?.trim() || undefined,
    title: row.title?.trim() || undefined,
    source: row.source?.trim() || undefined,
    status: row.status,
    notes: row.notes?.trim() || undefined,
    platform: row.platform?.trim() || undefined,
    friction_area: row.friction_area?.trim() || undefined,
    communication_channels: row.communication_channels?.trim() || undefined,
    signals: row.signals?.trim() || undefined,
    ai_summary: row.ai_summary?.trim() || undefined,
    tags: row.tags?.trim() || undefined,
    city: row.city?.trim() || undefined,
    state: row.state?.trim() || undefined,
    country: row.country?.trim() || undefined,
    postal_code: row.postal_code?.trim() || undefined,
    website: row.website?.trim() || undefined,
  };
}
