"use client";

import type { CustomFieldDefinition } from "@/types";

export type CustomFieldValues = Record<
  string,
  string | number | boolean | string[]
>;

interface EntityCustomFieldsFormProps {
  fields: CustomFieldDefinition[];
  values: CustomFieldValues;
  onChange: (values: CustomFieldValues) => void;
  isLoading?: boolean;
}

function fieldKey(field: CustomFieldDefinition) {
  return field.field_name;
}

export function EntityCustomFieldsForm({
  fields,
  values,
  onChange,
  isLoading,
}: EntityCustomFieldsFormProps) {
  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading custom fields…</p>;
  }

  if (fields.length === 0) return null;

  function setValue(key: string, value: CustomFieldValues[string]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-4 border-t border-[var(--card-border)] pt-5">
      <p className="text-sm font-semibold text-heading">Custom fields</p>
      {fields.map((field) => {
        const key = fieldKey(field);
        const label = (
          <label className="text-sm font-medium text-heading block mb-1">
            {field.field_name}
            {field.is_required && (
              <span className="text-[var(--error)] ml-0.5" aria-hidden>
                *
              </span>
            )}
          </label>
        );

        if (field.field_type === "checkbox") {
          return (
            <div key={field.id}>
              {label}
              <label className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(values[key])}
                  onChange={(e) => setValue(key, e.target.checked)}
                />
                {field.placeholder || "Yes"}
              </label>
              {field.description && (
                <p className="text-xs text-body-muted mt-1">{field.description}</p>
              )}
            </div>
          );
        }

        if (field.field_type === "multiselect") {
          const opts = (field.options as string[] | null) ?? [];
          const selected = Array.isArray(values[key])
            ? (values[key] as string[])
            : [];
          return (
            <div key={field.id}>
              {label}
              <div className="space-y-2 rounded-lg border border-[var(--card-border)] p-3 bg-[var(--card)]">
                {opts.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm text-heading">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt)}
                      onChange={(e) => {
                        setValue(
                          key,
                          e.target.checked
                            ? [...selected, opt]
                            : selected.filter((x) => x !== opt)
                        );
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          );
        }

        if (field.field_type === "select") {
          const opts = (field.options as string[] | null) ?? [];
          return (
            <div key={field.id}>
              {label}
              <select
                className="input-field w-full"
                value={typeof values[key] === "string" ? (values[key] as string) : ""}
                onChange={(e) => setValue(key, e.target.value)}
              >
                <option value="">{field.placeholder || "Select…"}</option>
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        const inputType =
          field.field_type === "number" || field.field_type === "currency"
            ? "number"
            : field.field_type === "date"
              ? "date"
              : "text";

        return (
          <div key={field.id}>
            {label}
            <input
              type={inputType}
              className="input-field w-full"
              placeholder={field.placeholder ?? ""}
              value={
                values[key] != null && values[key] !== ""
                  ? String(values[key])
                  : ""
              }
              onChange={(e) =>
                setValue(
                  key,
                  inputType === "number" ? e.target.valueAsNumber || e.target.value : e.target.value
                )
              }
            />
            {field.description && (
              <p className="text-xs text-body-muted mt-1">{field.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
