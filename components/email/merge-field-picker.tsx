"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  fields: { key: string; label: string }[];
  onSelect: (key: string) => void;
  onClose: () => void;
};

export function MergeFieldPicker({ open, fields, onSelect, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Insert merge field" size="md">
      <ul className="max-h-64 overflow-y-auto divide-y divide-[var(--card-border)]">
        {fields.map((f) => (
          <li key={f.key}>
            <button
              type="button"
              className="w-full text-left px-2 py-2 text-sm hover:bg-[var(--surface-subtle)]"
              onClick={() => onSelect(f.key)}
            >
              <span className="font-medium text-heading">{f.label}</span>
              <span className="text-body-muted ml-2 font-mono text-xs">{`{{${f.key}}}`}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-end pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
