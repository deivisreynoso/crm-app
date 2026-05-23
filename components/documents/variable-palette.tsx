"use client";

import { TEMPLATE_VARIABLES } from "@/lib/documents/template-variables";

interface VariablePaletteProps {
  onInsert: (variable: string) => void;
}

export function VariablePalette({ onInsert }: VariablePaletteProps) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-body-muted">
        Drag onto document or click to insert
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_VARIABLES.map((v) => (
          <span
            key={v}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", `{{${v}}}`);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onInsert(v)}
            className="cursor-grab active:cursor-grabbing rounded-md border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-xs font-mono text-[var(--primary)] hover:bg-[var(--sidebar-hover)]"
          >
            {`{{${v}}}`}
          </span>
        ))}
      </div>
    </div>
  );
}
