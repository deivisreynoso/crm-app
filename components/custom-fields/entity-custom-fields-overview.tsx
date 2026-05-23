"use client";

import { useEffect, useState } from "react";
import {
  EntityCustomFieldsForm,
  type CustomFieldValues,
} from "@/components/custom-fields/entity-custom-fields-form";
import { useCustomFields } from "@/hooks/useCustomFields";
import { normalizeCustomFieldValues } from "@/lib/custom-fields/normalize";
import { formatApiError } from "@/lib/validation-errors";
import type { CustomFieldDefinition } from "@/types";

interface EntityCustomFieldsOverviewProps {
  entityType: CustomFieldDefinition["entity_type"];
  values: Record<string, unknown> | null | undefined;
  onSave: (custom_fields: CustomFieldValues) => Promise<void>;
}

export function EntityCustomFieldsOverview({
  entityType,
  values: valuesProp,
  onSave,
}: EntityCustomFieldsOverviewProps) {
  const { data: fields = [], isLoading } = useCustomFields(entityType);
  const [values, setValues] = useState<CustomFieldValues>(() =>
    normalizeCustomFieldValues(valuesProp)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(normalizeCustomFieldValues(valuesProp));
  }, [valuesProp, entityType]);

  if (!isLoading && fields.length === 0) {
    return null;
  }

  async function handleChange(next: CustomFieldValues) {
    setValues(next);
    setError(null);
    setSaving(true);
    try {
      await onSave(next);
    } catch (err) {
      setError(formatApiError(err, "Could not save custom field"));
      setValues(normalizeCustomFieldValues(valuesProp));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-[var(--card-border)] pt-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-body-muted">
          Custom fields
        </h3>
        {saving && (
          <span className="text-[10px] text-body-muted">Saving…</span>
        )}
      </div>
      {error && (
        <p className="text-sm text-[var(--error)] mb-3">{error}</p>
      )}
      <EntityCustomFieldsForm
        fields={fields}
        isLoading={isLoading}
        values={values}
        onChange={(next) => void handleChange(next)}
      />
    </div>
  );
}
