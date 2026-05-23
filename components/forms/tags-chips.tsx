"use client";

import { useState } from "react";

interface TagsChipsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagsChips({
  tags,
  onChange,
  placeholder = "Type a tag and press Enter",
}: TagsChipsProps) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const name = raw.trim();
    if (!name) return;
    const exists = tags.some((t) => t.toLowerCase() === name.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...tags, name]);
    setDraft("");
  }

  function removeTag(name: string) {
    onChange(tags.filter((t) => t !== name));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {tags.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-2.5 py-1 text-xs font-medium"
          >
            {name}
            <button
              type="button"
              className="hover:text-[var(--error)] leading-none"
              onClick={() => removeTag(name)}
              aria-label={`Remove ${name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="input-field flex-1 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(draft);
            }
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-medium text-heading hover:bg-[var(--sidebar-hover)]"
          onClick={() => addTag(draft)}
        >
          Add tag
        </button>
      </div>
      <p className="text-xs text-body-muted">Press Enter or Add tag for each label.</p>
    </div>
  );
}
