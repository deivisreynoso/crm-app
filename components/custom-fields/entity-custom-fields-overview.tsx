"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EntityCustomFieldsForm,
  type CustomFieldValues,
} from "@/components/custom-fields/entity-custom-fields-form";
import { useCustomFields } from "@/hooks/useCustomFields";
import {
  normalizeCustomFieldValues,
  pruneCustomFieldValues,
  serializeCustomFieldValues,
} from "@/lib/custom-fields/normalize";
import { formatApiError } from "@/lib/validation-errors";
import type { CustomFieldDefinition } from "@/types";

const EMPTY_FIELDS: CustomFieldDefinition[] = [];

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
  const { data: fieldsData, isLoading } = useCustomFields(entityType);
  const fields = fieldsData ?? EMPTY_FIELDS;

  const fieldNamesKey = useMemo(
    () => fields.map((f) => f.field_name).sort().join("\0"),
    [fieldsData]
  );

  const externalFingerprint = useMemo(
    () => serializeCustomFieldValues(normalizeCustomFieldValues(valuesProp)),
    [valuesProp]
  );

  const prunedExternal = useMemo(() => {
    const fieldList = fieldsData ?? EMPTY_FIELDS;
    return pruneCustomFieldValues(
      normalizeCustomFieldValues(valuesProp),
      fieldList
    );
  }, [externalFingerprint, fieldNamesKey, fieldsData]);

  const [values, setValues] = useState<CustomFieldValues>(prunedExternal);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues((prev) => {
      if (
        serializeCustomFieldValues(prev) ===
        serializeCustomFieldValues(prunedExternal)
      ) {
        return prev;
      }
      return prunedExternal;
    });
  }, [prunedExternal]);

  if (!isLoading && fields.length === 0) {
    return null;
  }

  async function handleChange(next: CustomFieldValues) {
    const pruned = pruneCustomFieldValues(next, fields);
    setValues(pruned);
    setError(null);
    setSaving(true);
    try {
      await onSave(pruned);
    } catch (err) {
      setError(formatApiError(err, "Could not save custom field"));
      setValues(prunedExternal);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-[var(--card-border)] pt-5 sm:col-span-2">
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
