"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface InlineEditableFieldProps {
  label: string;
  value?: string | null;
  placeholder?: string;
  href?: string;
  multiline?: boolean;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
  onSave: (value: string) => Promise<void>;
  formatDisplay?: (value: string) => string;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1">
      {label}
      {required && (
        <span className="text-[var(--error)] normal-case ml-0.5" aria-hidden>
          *
        </span>
      )}
    </dt>
  );
}

export function InlineEditableField({
  label,
  value,
  placeholder = "Not set",
  href,
  multiline,
  readOnly,
  required,
  className,
  onSave,
  formatDisplay,
}: InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  const display = value
    ? formatDisplay
      ? formatDisplay(value)
      : value
    : null;

  async function commit() {
    const trimmed = draft.trim();
    const current = (value ?? "").trim();
    setEditing(false);
    if (trimmed === current) return;

    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  }

  if (readOnly) {
    return (
      <div className={className}>
        <FieldLabel label={label} required={required} />
        <dd className="mt-1 text-sm font-medium text-heading">
          {display ? (
            href ? (
              <a href={href} className="hover:underline">
                {display}
              </a>
            ) : (
              display
            )
          ) : (
            <span className="text-body-muted font-normal">{placeholder}</span>
          )}
        </dd>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <FieldLabel label={label} required={required} />
      <dd className="mt-1 min-w-0">
        {editing ? (
          <div className="space-y-1">
            {multiline ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
                className="input-field py-1.5 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setDraft(value ?? "");
                    setEditing(false);
                  }
                }}
              />
            ) : (
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                className="input-field py-1.5 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commit();
                  if (e.key === "Escape") {
                    setDraft(value ?? "");
                    setEditing(false);
                  }
                }}
              />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void commit()}
                disabled={saving}
                className="text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(value ?? "");
                  setEditing(false);
                }}
                className="text-xs text-body-muted hover:text-heading"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              "text-left text-sm font-medium rounded px-1 -mx-1 py-0.5 w-full min-w-0 max-w-full",
              "hover:bg-[var(--sidebar-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
              display ? "text-heading" : "text-body-muted font-normal"
            )}
          >
            {saving ? (
              <span className="text-body-muted">Saving…</span>
            ) : display ? (
              href ? (
                <span
                  className="underline break-words"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <a href={href}>{display}</a>
                </span>
              ) : (
                <span
                  className={cn(
                    "block max-w-full",
                    multiline && "break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
                  )}
                >
                  {display}
                </span>
              )
            ) : (
              placeholder
            )}
            <span className="block text-[10px] text-body-muted font-normal mt-0.5">
              Click to edit
            </span>
          </button>
        )}
      </dd>
    </div>
  );
}
