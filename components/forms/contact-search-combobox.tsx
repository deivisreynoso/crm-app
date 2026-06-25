"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import type { Contact } from "@/types";

type ContactSearchComboboxProps = {
  value: string;
  onChange: (contactId: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label?: string;
  error?: string;
};

function contactLabel(c: Contact): string {
  const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
  const parts = [name || c.email || "Contact"];
  if (c.company?.trim()) parts.push(c.company.trim());
  if (c.email && name) parts.push(c.email);
  return parts.join(" · ");
}

export function ContactSearchCombobox({
  value,
  onChange,
  required,
  disabled,
  id,
  label = "Contact",
  error,
}: ContactSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(null);
      return;
    }
    if (selected?.id === value) return;

    let cancelled = false;
    void axios
      .get<Contact>(`/api/contacts/${value}`)
      .then((res) => {
        if (!cancelled) setSelected(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setSelected(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value, selected?.id]);

  useEffect(() => {
    if (debounced.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOptions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void axios
      .get<{ data: Contact[] }>("/api/contacts", {
        params: { search: debounced, page: 1, limit: 25 },
      })
      .then((res) => {
        if (!cancelled) setOptions(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const showList = !selected && debounced.length >= 2 && !disabled;

  const hint = useMemo(() => {
    if (selected) return null;
    if (debounced.length > 0 && debounced.length < 2) {
      return "Type at least 2 characters to search.";
    }
    if (loading) return "Searching…";
    if (showList && options.length === 0) return "No contacts found.";
    return null;
  }, [debounced.length, loading, showList, options.length, selected]);

  function clearSelection() {
    onChange("");
    setSelected(null);
    setQuery("");
    setOptions([]);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-heading mb-1">
        {label}
        {required && <span className="text-[var(--error)]"> *</span>}
      </label>

      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2">
          <span className="flex-1 text-sm text-heading truncate">
            {contactLabel(selected)}
          </span>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-body-muted hover:text-heading hover:bg-[var(--sidebar-hover)]"
            onClick={clearSelection}
            disabled={disabled}
            aria-label="Clear contact"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <input
          id={id}
          className="input-field w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts by name or email…"
          disabled={disabled}
          autoComplete="off"
        />
      )}

      {hint && <p className="text-xs text-body-muted mt-1">{hint}</p>}
      {error && <p className="text-sm text-[var(--error)] mt-1">{error}</p>}
      {showList && options.length > 0 && (
        <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--card-border)] divide-y divide-[var(--card-border)]">
          {options.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--sidebar-hover)]"
                onClick={() => {
                  onChange(c.id);
                  setSelected(c);
                  setQuery("");
                  setOptions([]);
                }}
              >
                {c.first_name} {c.last_name}
                {c.company?.trim() ? ` · ${c.company}` : ""}
                {c.email ? (
                  <span className="text-body-muted"> — {c.email}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
