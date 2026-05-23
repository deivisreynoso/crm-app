import type { CustomFieldValues } from "@/components/custom-fields/entity-custom-fields-form";

export function normalizeCustomFieldValues(
  raw: Record<string, unknown> | null | undefined
): CustomFieldValues {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as CustomFieldValues;
}
