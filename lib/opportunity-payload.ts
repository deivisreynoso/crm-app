import type { OpportunityFormData } from "@/lib/validators";
import { parseTagsInput } from "@/lib/tags";

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export function buildOpportunityRecord(
  data: OpportunityFormData,
  userId: string
) {
  return {
    user_id: userId,
    contact_id: data.contact_id,
    pipeline_id: data.pipeline_id || null,
    title: data.title,
    value: data.value ?? null,
    currency: data.currency || "USD",
    stage: data.stage,
    probability: data.probability ?? 50,
    expected_close_date: emptyToNull(data.expected_close_date),
    notes: emptyToNull(data.notes),
    tags: data.tags ? parseTagsInput(data.tags) : [],
    company_id: data.company_id?.trim() ? data.company_id : null,
  };
}

export function buildOpportunityUpdate(data: Partial<OpportunityFormData>) {
  const record: Record<string, unknown> = {};

  if (data.contact_id !== undefined) record.contact_id = data.contact_id;
  if (data.pipeline_id !== undefined) record.pipeline_id = data.pipeline_id || null;
  if (data.title !== undefined) record.title = data.title;
  if (data.value !== undefined) record.value = data.value ?? null;
  if (data.currency !== undefined) record.currency = data.currency;
  if (data.stage !== undefined) record.stage = data.stage;
  if (data.probability !== undefined) record.probability = data.probability;
  if (data.expected_close_date !== undefined) {
    record.expected_close_date = emptyToNull(data.expected_close_date);
  }
  if (data.notes !== undefined) record.notes = emptyToNull(data.notes);
  if (data.tags !== undefined) {
    record.tags = data.tags ? parseTagsInput(data.tags) : [];
  }
  if (data.company_id !== undefined) {
    record.company_id = data.company_id?.trim() ? data.company_id : null;
  }

  return record;
}
