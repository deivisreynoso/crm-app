"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
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

  const showList = debounced.length >= 2 && !disabled;

  const hint = useMemo(() => {
    if (debounced.length > 0 && debounced.length < 2) {
      return "Type at least 2 characters to search.";
    }
    if (loading) return "Searching…";
    if (showList && options.length === 0) return "No contacts found.";
    return null;
  }, [debounced.length, loading, showList, options.length]);

  return (
    <div>
      <label className="block text-sm font-medium text-heading mb-1">
        {label}
        {required && <span className="text-[var(--error)]"> *</span>}
      </label>
      <input
        id={id}
        className="input-field w-full"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search contacts by name or email…"
        disabled={disabled}
        autoComplete="off"
      />
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
