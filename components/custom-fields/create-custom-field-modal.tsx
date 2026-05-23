"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CustomFieldInputPreview } from "@/components/custom-fields/custom-field-input-preview";
import { useCreateCustomField } from "@/hooks/useCustomFields";
import { formatApiError } from "@/lib/validation-errors";
import type { CustomFieldDefinition } from "@/types";

const ENTITY_TYPES = ["contact", "opportunity", "ticket"] as const;

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Single line" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Monetary" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "multiselect", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
] as const;

interface CreateCustomFieldModalProps {
  open: boolean;
  onClose: () => void;
  defaultEntity?: (typeof ENTITY_TYPES)[number];
  onCreated?: () => void;
}

export function CreateCustomFieldModal({
  open,
  onClose,
  defaultEntity = "contact",
  onCreated,
}: CreateCustomFieldModalProps) {
  const createField = useCreateCustomField();
  const [entityType, setEntityType] = useState(defaultEntity);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] =
    useState<CustomFieldDefinition["field_type"]>("text");
  const [description, setDescription] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [options, setOptions] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsOptions =
    fieldType === "select" || fieldType === "multiselect";

  const previewField = useMemo(
    () => ({
      field_name: fieldName || "Field name",
      field_type: fieldType,
      placeholder,
      options: needsOptions
        ? options
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : [],
      is_required: isRequired,
    }),
    [fieldName, fieldType, placeholder, options, isRequired, needsOptions]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fieldName.trim()) return;
    if (needsOptions && !options.trim()) {
      setError("Add at least one option (comma-separated) for dropdown fields.");
      return;
    }
    try {
      await createField.mutateAsync({
        entity_type: entityType,
        field_name: fieldName.trim(),
        field_type: fieldType,
        description: description.trim() || undefined,
        placeholder: placeholder.trim() || undefined,
        is_required: isRequired,
        options: needsOptions
          ? options
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
      });
      setFieldName("");
      setOptions("");
      setDescription("");
      setPlaceholder("");
      onCreated?.();
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Could not create field"));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create custom field" size="xl">
      <p className="text-sm text-body-muted mb-4">
        Define how this field appears on {entityType} records. Use the preview to
        test dropdowns and inputs before saving.
      </p>
      {error && (
        <p className="mb-4 text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-body-muted block mb-1">
                Field type
              </label>
              <select
                className="input-field w-full"
                value={fieldType}
                onChange={(e) =>
                  setFieldType(
                    e.target.value as CustomFieldDefinition["field_type"]
                  )
                }
              >
                {FIELD_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-body-muted block mb-1">
                Add to object
              </label>
              <select
                className="input-field w-full capitalize"
                value={entityType}
                onChange={(e) =>
                  setEntityType(e.target.value as (typeof ENTITY_TYPES)[number])
                }
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-body-muted block mb-1">
                Field name
              </label>
              <input
                className="input-field w-full"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-body-muted block mb-1">
                Description (optional)
              </label>
              <textarea
                className="input-field w-full min-h-[72px]"
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Help text for your team"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-body-muted block mb-1">
                {fieldType === "checkbox" ? "Checkbox label" : "Placeholder"}
              </label>
              <input
                className="input-field w-full"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder={
                  fieldType === "checkbox"
                    ? "e.g. Subscribe to newsletter"
                    : "Shown before the user types"
                }
              />
            </div>
            {needsOptions && (
              <div>
                <label className="text-xs font-medium text-body-muted block mb-1">
                  Options (comma-separated)
                </label>
                <input
                  className="input-field w-full"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="Small, Medium, Enterprise"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-heading">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
              Required field
            </label>
          </div>

          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-5 min-h-[280px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-body-muted mb-4">
              Live preview — interactive
            </p>
            <CustomFieldInputPreview field={previewField} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--card-border)]">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createField.isPending}>
            Create field
          </Button>
        </div>
      </form>
    </Modal>
  );
}
