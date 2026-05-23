import type { CustomFieldValues } from "@/components/custom-fields/entity-custom-fields-form";
import type { CustomFieldDefinition } from "@/types";

export function normalizeCustomFieldValues(
  raw: Record<string, unknown> | null | undefined
): CustomFieldValues {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as CustomFieldValues;
}

/** Stable JSON for comparing custom field payloads. */
export function serializeCustomFieldValues(values: CustomFieldValues): string {
  const sorted = Object.keys(values)
    .sort()
    .reduce<CustomFieldValues>((acc, key) => {
      acc[key] = values[key];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

/** Drop values for fields that were deleted from Settings. */
export function pruneCustomFieldValues(
  values: CustomFieldValues,
  fields: Pick<CustomFieldDefinition, "field_name">[]
): CustomFieldValues {
  const allowed = new Set(fields.map((f) => f.field_name));
  const next: CustomFieldValues = {};
  for (const key of allowed) {
    if (values[key] !== undefined) {
      next[key] = values[key];
    }
  }
  return next;
}
