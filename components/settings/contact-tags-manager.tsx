"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useContactTags,
  useCreateContactTag,
  useDeleteContactTag,
} from "@/hooks/useContactTags";
import { formatApiError } from "@/lib/validation-errors";

export function ContactTagsManager() {
  const { data: tags = [], isLoading } = useContactTags();
  const createTag = useCreateContactTag();
  const deleteTag = useDeleteContactTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1b318b");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await createTag.mutateAsync({ name: name.trim(), color });
      setName("");
    } catch (err) {
      setError(formatApiError(err, "Could not add tag"));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        Workspace tag library for contacts. Suggested when editing contact tags.
      </p>
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[10rem]">
          <label className="text-xs text-body-muted block mb-1">Tag name</label>
          <input
            className="input-field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="hot-lead"
          />
        </div>
        <div>
          <label className="text-xs text-body-muted block mb-1">Color</label>
          <input
            type="color"
            className="h-10 w-14 rounded border border-[var(--card-border)]"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={createTag.isPending}>
          Add tag
        </Button>
      </form>
      {isLoading ? (
        <p className="text-sm text-body-muted">Loading tags…</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-body-muted">No tags yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li
              key={t.id}
              className="inline-flex items-center gap-2 rounded-full pl-3 pr-1 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.name}
              <button
                type="button"
                className="rounded-full px-1.5 py-0.5 text-white/80 hover:text-white hover:bg-black/20"
                onClick={() => void deleteTag.mutateAsync(t.id)}
                aria-label={`Remove ${t.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
