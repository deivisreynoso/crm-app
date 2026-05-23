"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  useCreateSavedFilter,
  useDeleteSavedFilter,
  useSavedFilters,
} from "@/hooks/useSavedFilters";
import { formatApiError } from "@/lib/validation-errors";

interface SavedFiltersBarProps {
  entityType: "contact" | "ticket" | "account" | "opportunity";
  currentConfig: Record<string, unknown>;
  onApply: (config: Record<string, unknown>) => void;
}

export function SavedFiltersBar({
  entityType,
  currentConfig,
  onApply,
}: SavedFiltersBarProps) {
  const { data: filters = [] } = useSavedFilters(entityType);
  const createFilter = useCreateSavedFilter();
  const deleteFilter = useDeleteSavedFilter();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await createFilter.mutateAsync({
        name: name.trim(),
        entity_type: entityType,
        filter_config: currentConfig,
      });
      setName("");
      setSaveOpen(false);
    } catch (err) {
      setError(formatApiError(err, "Could not save filter"));
    }
  }

  if (filters.length === 0) {
    return (
      <>
        <Button type="button" variant="outline" size="sm" onClick={() => setSaveOpen(true)}>
          Save filter
        </Button>
        <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save filter">
          <form onSubmit={handleSave} className="space-y-3">
            {error && <p className="text-sm text-[var(--error)]">{error}</p>}
            <input
              className="input-field w-full"
              placeholder="Filter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Modal>
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input-field text-sm min-w-[10rem]"
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          const f = filters.find((x) => x.id === id);
          if (f) onApply(f.filter_config);
          e.target.value = "";
        }}
      >
        <option value="">Saved filters…</option>
        {filters.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <Button type="button" variant="outline" size="sm" onClick={() => setSaveOpen(true)}>
        Save current
      </Button>
      <select
        className="input-field text-sm text-body-muted max-w-[8rem]"
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          void deleteFilter.mutateAsync({ id, entityType });
          e.target.value = "";
        }}
      >
        <option value="">Delete…</option>
        {filters.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save filter">
        <form onSubmit={handleSave} className="space-y-3">
          {error && <p className="text-sm text-[var(--error)]">{error}</p>}
          <input
            className="input-field w-full"
            placeholder="e.g. Active leads"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
