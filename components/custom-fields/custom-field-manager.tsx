"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateCustomFieldModal } from "@/components/custom-fields/create-custom-field-modal";
import { EditCustomFieldModal } from "@/components/custom-fields/edit-custom-field-modal";
import type { CustomFieldDefinition } from "@/types";
import {
  useCustomFields,
  useDeleteCustomField,
} from "@/hooks/useCustomFields";

const ENTITY_TYPES = ["contact", "opportunity", "ticket"] as const;

export function CustomFieldManager() {
  const [entityType, setEntityType] =
    useState<(typeof ENTITY_TYPES)[number]>("contact");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);

  const { data: fields = [], isLoading, refetch } = useCustomFields(entityType);
  const deleteField = useDeleteCustomField();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ENTITY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEntityType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                entityType === t
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--sidebar-hover)] text-body-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Create custom field
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-body-muted">Loading fields…</p>
      ) : fields.length === 0 ? (
        <p className="text-sm text-body-muted">
          No custom fields for {entityType} yet.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--card-border)] border border-[var(--card-border)] rounded-lg overflow-hidden">
          {fields.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--card)]"
            >
              <div>
                <p className="text-sm font-medium text-heading">{f.field_name}</p>
                <p className="text-xs text-body-muted capitalize">
                  {f.field_type}
                  {f.description ? ` · ${f.description}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(f)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void deleteField.mutateAsync(f.id)}
                  disabled={deleteField.isPending}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CreateCustomFieldModal
        open={modalOpen}
        defaultEntity={entityType}
        onClose={() => setModalOpen(false)}
        onCreated={() => void refetch()}
      />
      <EditCustomFieldModal
        field={editing}
        onClose={() => setEditing(null)}
        onSaved={() => void refetch()}
      />
    </div>
  );
}
