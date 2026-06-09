"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

function reorderStages(
  stages: PipelineStage[],
  fromIndex: number,
  toIndex: number
): PipelineStage[] {
  if (fromIndex === toIndex) return stages;
  const next = [...stages];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((stage, index) => ({ ...stage, order: index }));
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
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  function handleStageDrop(toIndex: number) {
    if (dragFromIndex === null || dragFromIndex === toIndex) {
      setDragFromIndex(null);
      setDragOverIndex(null);
      return;
    }
    setLocalStages((prev) => reorderStages(prev, dragFromIndex, toIndex));
    setDragFromIndex(null);
    setDragOverIndex(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ordered = sortStages(localStages).map((stage, index) => ({
      ...stage,
      order: index,
    }));
    await onSave({ name: name.trim(), stages: ordered });
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
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Stages
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Drag stages to change their order on the board.
        </p>
        <ul className="space-y-2 mb-3">
          {localStages.map((stage, index) => (
            <li
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverIndex(index);
              }}
              onDragLeave={() => {
                setDragOverIndex((current) =>
                  current === index ? null : current
                );
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleStageDrop(index);
              }}
              className={cn(
                "flex gap-2 items-center rounded-md border border-transparent px-1 py-0.5 transition-colors",
                dragOverIndex === index &&
                  dragFromIndex !== null &&
                  dragFromIndex !== index &&
                  "border-[var(--secondary)] bg-[var(--sidebar-hover)]",
                dragFromIndex === index && "opacity-50"
              )}
            >
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                  setDragFromIndex(index);
                }}
                onDragEnd={() => {
                  setDragFromIndex(null);
                  setDragOverIndex(null);
                }}
                className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-[var(--sidebar-hover)] hover:text-slate-600 active:cursor-grabbing"
                aria-label={`Drag to reorder ${stage.name}`}
              >
                <GripVertical className="h-4 w-4" aria-hidden />
              </button>
              <span className="text-xs text-slate-400 w-5 tabular-nums">
                {index + 1}
              </span>
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
