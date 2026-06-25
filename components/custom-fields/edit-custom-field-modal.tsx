"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CustomFieldInputPreview } from "@/components/custom-fields/custom-field-input-preview";
import { useUpdateCustomField } from "@/hooks/useCustomFields";
import { formatApiError } from "@/lib/validation-errors";
import type { CustomFieldDefinition } from "@/types";

interface EditCustomFieldModalProps {
  field: CustomFieldDefinition | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditCustomFieldModal({
  field,
  onClose,
  onSaved,
}: EditCustomFieldModalProps) {
  const updateField = useUpdateCustomField();
  const [fieldName, setFieldName] = useState("");
  const [description, setDescription] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [options, setOptions] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsOptions =
    field?.field_type === "select" || field?.field_type === "multiselect";

  useEffect(() => {
    if (!field) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFieldName(field.field_name);
    setDescription(field.description ?? "");
    setPlaceholder(field.placeholder ?? "");
    setIsRequired(field.is_required ?? false);
    const opts = field.options as string[] | null;
    setOptions(opts?.join(", ") ?? "");
    setError(null);
  }, [field]);

  const previewField = useMemo(
    () => ({
      field_name: fieldName || "Field name",
      field_type: field?.field_type ?? "text",
      placeholder: placeholder ?? "",
      options: needsOptions
        ? options
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : [],
      is_required: isRequired,
    }),
    [fieldName, field?.field_type, placeholder, options, isRequired, needsOptions]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!field) return;
    setError(null);
    if (!fieldName.trim()) {
      setError("Enter a field name.");
      return;
    }
    if (needsOptions && !options.trim()) {
      setError("Add at least one option (comma-separated).");
      return;
    }
    try {
      await updateField.mutateAsync({
        id: field.id,
        data: {
          field_name: fieldName.trim(),
          description: description.trim() || undefined,
          placeholder: placeholder.trim() || undefined,
          is_required: isRequired,
          options: needsOptions
            ? options
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined,
        },
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Could not update field"));
    }
  }

  return (
    <Modal
      open={!!field}
      onClose={onClose}
      title="Edit custom field"
      size="xl"
    >
      {field && (
        <>
          <p className="text-sm text-body-muted mb-4 capitalize">
            Object: {field.entity_type} · Type: {field.field_type}
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-body-muted block mb-1">
                    {field.field_type === "checkbox" ? "Checkbox label" : "Placeholder"}
                  </label>
                  <input
                    className="input-field w-full"
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
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
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-body-muted mb-4">
                  Live preview
                </p>
                <CustomFieldInputPreview field={previewField} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--card-border)]">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateField.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
