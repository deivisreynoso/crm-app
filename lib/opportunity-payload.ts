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
    owner_id: data.owner_id?.trim() ? data.owner_id : null,
    tags: data.tags ? parseTagsInput(data.tags) : [],
    company_id: data.company_id?.trim() ? data.company_id : null,
    custom_fields: data.custom_fields ?? {},
  };
}

export function buildOpportunityUpdate(
  data: Partial<OpportunityFormData> & { project_feedback_token?: string }
) {
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
  if (data.owner_id !== undefined) {
    record.owner_id = data.owner_id?.trim() ? data.owner_id : null;
  }
  if (data.tags !== undefined) {
    record.tags = data.tags ? parseTagsInput(data.tags) : [];
  }
  if (data.company_id !== undefined) {
    record.company_id = data.company_id?.trim() ? data.company_id : null;
  }
  if (data.loss_reason !== undefined) {
    record.loss_reason = emptyToNull(data.loss_reason);
  }
  if (data.loss_reason_notes !== undefined) {
    record.loss_reason_notes = emptyToNull(data.loss_reason_notes);
  }
  if (data.custom_fields !== undefined) {
    record.custom_fields = data.custom_fields ?? {};
  }
  if (data.project_feedback_token !== undefined) {
    record.project_feedback_token = data.project_feedback_token?.trim()
      ? data.project_feedback_token.trim()
      : null;
  }

  return record;
}
