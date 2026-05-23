"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AssociationSelectProps {
  label: string;
  value: string;
  options: { id: string; label: string; href?: string }[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  allowEmpty?: boolean;
  onChange: (id: string) => Promise<void>;
}

export function AssociationSelect({
  label,
  value,
  options,
  placeholder = "Select record…",
  required,
  className,
  allowEmpty = true,
  onChange,
}: AssociationSelectProps) {
  const [localValue, setLocalValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const selected = options.find((o) => o.id === localValue);

  async function handleChange(next: string) {
    setLocalValue(next);
    if (next === value) return;

    setSaving(true);
    setError(null);
    try {
      await onChange(next);
    } catch (err) {
      setLocalValue(value);
      setError(err instanceof Error ? err.message : "Failed to save");
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
        disabled={saving || options.length === 0}
        className={cn(
          "input-field text-sm font-medium w-full min-h-[2.5rem]",
          !localValue && "text-body-muted",
          saving && "opacity-60"
        )}
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="text-xs text-body-muted mt-1">No accounts available</p>
      )}
      {saving && <p className="text-xs text-body-muted mt-1">Saving…</p>}
      {error && <p className="text-xs text-[var(--error)] mt-1">{error}</p>}
      {selected?.href && !saving && (
        <Link
          href={selected.href}
          className="text-xs text-[var(--secondary)] hover:underline inline-block mt-1"
        >
          Open {label.toLowerCase()} →
        </Link>
      )}
    </div>
  );
}
