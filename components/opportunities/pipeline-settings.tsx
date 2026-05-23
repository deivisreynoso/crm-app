"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PipelineStage } from "@/types";
import { sortStages } from "@/lib/constants/pipelines";

interface PipelineSettingsProps {
  pipelineName: string;
  stages: PipelineStage[];
  onSave: (input: { name: string; stages: PipelineStage[] }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  canDelete?: boolean;
  deleteBlockedReason?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function PipelineSettings({
  pipelineName,
  stages,
  onSave,
  onDelete,
  onCancel,
  isLoading,
  isDeleting,
  canDelete = true,
  deleteBlockedReason,
}: PipelineSettingsProps) {
  const [name, setName] = useState(pipelineName);
  const [localStages, setLocalStages] = useState<PipelineStage[]>(
    sortStages(stages)
  );
  const [newStageName, setNewStageName] = useState("");

  function handleAddStage() {
    if (!newStageName.trim()) return;
    const id = slugify(newStageName) || `stage_${Date.now()}`;
    setLocalStages((prev) => [
      ...prev,
      { id, name: newStageName.trim(), order: prev.length },
    ]);
    setNewStageName("");
  }

  function handleRemoveStage(id: string) {
    if (localStages.length <= 1) return;
    setLocalStages((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i }))
    );
  }

  function handleRenameStage(id: string, newName: string) {
    setLocalStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ name: name.trim(), stages: localStages });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Pipeline name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Stages
        </label>
        <ul className="space-y-2 mb-3">
          {localStages.map((stage, index) => (
            <li key={stage.id} className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-5">{index + 1}</span>
              <input
                value={stage.name}
                onChange={(e) => handleRenameStage(stage.id, e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm"
              />
              <button
                type="button"
                onClick={() => handleRemoveStage(stage.id)}
                disabled={localStages.length <= 1}
                className="text-xs text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            placeholder="New stage name"
            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddStage}>
            Add stage
          </Button>
        </div>
      </div>

      {onDelete && (
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <p className="text-sm font-medium text-slate-700">Danger zone</p>
          {deleteBlockedReason && (
            <p className="text-xs text-slate-500">{deleteBlockedReason}</p>
          )}
          <Button
            type="button"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={!canDelete || isDeleting || isLoading}
            onClick={() => void onDelete()}
          >
            {isDeleting ? "Deleting…" : "Delete pipeline"}
          </Button>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || isDeleting}>
          {isLoading ? "Saving..." : "Save pipeline"}
        </Button>
      </div>
    </form>
  );
}
