import type { TicketFormData } from "@/lib/validators";
import { parseTagsInput } from "@/lib/tags";

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export function buildTicketRecord(data: TicketFormData, userId: string) {
  const subject = data.subject?.trim() || data.title?.trim() || "";
  return {
    user_id: userId,
    contact_id: data.contact_id?.trim() ? data.contact_id : null,
    company_id: data.company_id?.trim() ? data.company_id : null,
    subject,
    title: subject,
    description: emptyToNull(data.description),
    status: data.status,
    priority: data.priority,
    assigned_to: emptyToNull(data.assigned_to) as string | null,
    category: emptyToNull(data.category),
    tags: data.tags ? parseTagsInput(data.tags) : [],
    custom_fields: data.custom_fields ?? {},
  };
}

export function buildTicketUpdate(data: Partial<TicketFormData>) {
  const record: Record<string, unknown> = {};

  if (data.contact_id !== undefined) {
    record.contact_id = data.contact_id?.trim() ? data.contact_id : null;
  }
  if (data.company_id !== undefined) {
    record.company_id = data.company_id?.trim() ? data.company_id : null;
  }
  if (data.subject !== undefined) {
    const subject = data.subject.trim();
    record.subject = subject;
    record.title = subject;
  } else if (data.title !== undefined) {
    record.title = data.title;
    record.subject = data.title;
  }
  if (data.description !== undefined) record.description = emptyToNull(data.description);
  if (data.status !== undefined) {
    record.status = data.status;
    if (data.status === "closed") {
      record.resolved_at = new Date().toISOString();
    }
  }
  if (data.priority !== undefined) record.priority = data.priority;
  if (data.assigned_to !== undefined) {
    record.assigned_to = emptyToNull(data.assigned_to);
  }
  if (data.category !== undefined) record.category = emptyToNull(data.category);
  if (data.tags !== undefined) {
    record.tags = data.tags ? parseTagsInput(data.tags) : [];
  }
  if (data.custom_fields !== undefined) {
    record.custom_fields = data.custom_fields ?? {};
  }

  return record;
}
