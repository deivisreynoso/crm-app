import { z } from "zod";

/** Accept null/undefined from N8N and normalize to optional strings. */
const nullishString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null || v === "" ? undefined : v));

const nullishStringList = z
  .union([z.array(z.string()), z.string(), z.null()])
  .optional()
  .transform((v) => (v == null ? undefined : v));

export const leadQualificationFieldsSchema = z.object({
  platform: nullishString,
  friction_area: nullishStringList,
  communication_channels: nullishStringList,
  signals: nullishString,
  ai_summary: nullishString,
  recommended_offer: nullishString,
  qualified: z.boolean().nullish().transform((v) => v ?? undefined),
  confidence_score: z.number().nullish().transform((v) => v ?? undefined),
});

export type LeadQualificationPayload = z.infer<typeof leadQualificationFieldsSchema>;

export const leadQualificationSchema = z.preprocess(
  (val) => (val === null ? undefined : val),
  leadQualificationFieldsSchema.optional()
);

export const leadContactInfoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  company: z.string().optional(),
});
