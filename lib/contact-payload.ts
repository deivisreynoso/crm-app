import type { ContactFormData } from "@/lib/validators";
import type { Contact } from "@/types";
import { parseTagsInput } from "@/lib/tags";
import { canonicalEmail } from "@/lib/identity/normalize";
import { formatPhone, parsePhoneParts } from "@/lib/phone";

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

function normalizePhoneField(phone: string | undefined): string | null {
  const raw = phone?.trim();
  if (!raw) return null;
  const { dialCode, number } = parsePhoneParts(raw);
  return formatPhone(dialCode, number) || null;
}

function normalizeEmailField(email: string | undefined): string | null {
  return canonicalEmail(email) ?? emptyToNull(email);
}

export function buildContactRecord(data: ContactFormData, userId?: string) {
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    email: normalizeEmailField(data.email),
    phone: normalizePhoneField(data.phone),
    company: emptyToNull(data.company),
    title: emptyToNull(data.title),
    source: emptyToNull(data.source),
    status: data.status,
    notes: emptyToNull(data.notes),
    preferred_language: emptyToNull(data.preferred_language),
    website: emptyToNull(data.website),
    date_of_birth: emptyToNull(data.date_of_birth),
    preferred_contact_method: emptyToNull(data.preferred_contact_method),
    signals: emptyToNull(data.signals),
    platform: emptyToNull(data.platform),
    friction_area: emptyToNull(data.friction_area),
    communication_channels: emptyToNull(data.communication_channels),
    street_address: emptyToNull(data.street_address),
    city: emptyToNull(data.city),
    state: emptyToNull(data.state),
    postal_code: emptyToNull(data.postal_code),
    country: emptyToNull(data.country),
    timezone: emptyToNull(data.timezone),
    tags: data.tags ? parseTagsInput(data.tags) : [],
    company_id: data.company_id?.trim() ? data.company_id : null,
    custom_fields: data.custom_fields ?? {},
    ...(userId ? { user_id: userId } : {}),
  };
}

const STRING_FIELDS = [
  "company",
  "title",
  "source",
  "notes",
  "preferred_language",
  "website",
  "date_of_birth",
  "preferred_contact_method",
  "signals",
  "platform",
  "friction_area",
  "communication_channels",
  "street_address",
  "city",
  "state",
  "postal_code",
  "country",
  "timezone",
] as const;

export function buildContactUpdate(data: Partial<ContactFormData>) {
  const record: Record<string, unknown> = {};

  if (data.first_name !== undefined) record.first_name = data.first_name;
  if (data.last_name !== undefined) record.last_name = data.last_name;
  if (data.status !== undefined) record.status = data.status;

  for (const key of STRING_FIELDS) {
    if (data[key] !== undefined) {
      record[key] = emptyToNull(data[key]);
    }
  }

  if (data.email !== undefined) {
    record.email = normalizeEmailField(data.email);
  }
  if (data.phone !== undefined) {
    record.phone = normalizePhoneField(data.phone);
  }

  if (data.tags !== undefined) {
    record.tags = data.tags ? parseTagsInput(data.tags) : [];
  }
  if (data.company_id !== undefined) {
    record.company_id = data.company_id?.trim() ? data.company_id : null;
  }
  if (data.custom_fields !== undefined) {
    record.custom_fields = data.custom_fields ?? {};
  }

  return record;
}

export function contactToFormDefaults(contact: Contact): Partial<ContactFormData> {
  return {
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
    title: contact.title ?? "",
    source: contact.source ?? "",
    status: contact.status,
    notes: contact.notes ?? "",
    preferred_language: contact.preferred_language ?? "",
    website: contact.website ?? "",
    date_of_birth: contact.date_of_birth ?? "",
    preferred_contact_method: contact.preferred_contact_method ?? "",
    signals: contact.signals ?? "",
    platform: contact.platform ?? "",
    friction_area: contact.friction_area ?? "",
    communication_channels: contact.communication_channels ?? "",
    street_address: contact.street_address ?? "",
    city: contact.city ?? "",
    state: contact.state ?? "",
    postal_code: contact.postal_code ?? "",
    country: contact.country ?? "",
    timezone: contact.timezone ?? "",
    tags: contact.tags?.join(", ") ?? "",
    company_id: contact.company_id ?? "",
    custom_fields: (contact.custom_fields as ContactFormData["custom_fields"]) ?? {},
  };
}
