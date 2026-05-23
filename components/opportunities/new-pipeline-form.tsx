"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NewPipelineFormProps {
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function NewPipelineForm({
  onSubmit,
  onCancel,
  isLoading,
}: NewPipelineFormProps) {
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name.trim());
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Pipeline name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          placeholder="e.g. Sales Pipeline"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading ? "Creating..." : "Create"}
        </Button>
      </div>
    </form>
  );
}
