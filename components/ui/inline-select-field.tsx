"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { cn } from "@/lib/utils";

function saveErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data as { error?: string } | undefined;
    return msg?.error ?? err.message;
  }
  return err instanceof Error ? err.message : "Failed to save";
}

export type SelectOption = { value: string; label: string };

interface InlineSelectFieldProps {
  label: string;
  value?: string | null;
  options: readonly SelectOption[] | readonly string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  readOnly?: boolean;
  onSave: (value: string) => Promise<void>;
}

function normalizeOptions(
  options: InlineSelectFieldProps["options"]
): SelectOption[] {
  if (options.length === 0) return [];
  if (typeof options[0] === "string") {
    return (options as readonly string[]).map((o) => ({ value: o, label: o }));
  }
  return options as SelectOption[];
}

export function InlineSelectField({
  label,
  value,
  options,
  placeholder = "Select…",
  required,
  className,
  allowEmpty,
  emptyLabel = "— None —",
  readOnly,
  onSave,
}: InlineSelectFieldProps) {
  const items = normalizeOptions(options);
  const [localValue, setLocalValue] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  async function handleChange(next: string) {
    setLocalValue(next);
    if (next === (value ?? "")) return;

    setSaving(true);
    setError(null);
    try {
      await onSave(next);
    } catch (err) {
      setLocalValue(value ?? "");
      setError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={className}>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-body-muted mb-1 block">
        {label}
        {required && (
          <span className="text-[var(--error)] normal-case ml-0.5" aria-hidden>
            *
          </span>
        )}
      </label>
      <select
        value={localValue}
        onChange={(e) => void handleChange(e.target.value)}
        disabled={saving || readOnly}
        className={cn(
          "input-field text-sm font-medium w-full min-h-[2.5rem]",
          !localValue && "text-body-muted",
          saving && "opacity-60"
        )}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {!allowEmpty && !localValue && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {items.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {saving && <p className="text-xs text-body-muted mt-1">Saving…</p>}
      {error && <p className="text-xs text-[var(--error)] mt-1">{error}</p>}
    </div>
  );
}
