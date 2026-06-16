"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import type { Contact } from "@/types";

type Props = {
  label: string;
  selectedIds: string[];
  excludeId?: string;
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

function contactLabel(c: Contact): string {
  const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
  return [name || c.email || "Contact", c.email && name ? c.email : null]
    .filter(Boolean)
    .join(" · ");
}

export function ContactMultiSelect({
  label,
  selectedIds,
  excludeId,
  onChange,
  disabled,
}: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!selectedIds.length) {
      setSelected([]);
      return;
    }
    let cancelled = false;
    void Promise.all(
      selectedIds.map((id) =>
        axios.get<Contact>(`/api/contacts/${id}`).then((r) => r.data)
      )
    )
      .then((rows) => {
        if (!cancelled) setSelected(rows.filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setSelected([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIds]);

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
        if (cancelled) return;
        const rows = (res.data.data ?? []).filter(
          (c) => c.id !== excludeId && !selectedIds.includes(c.id)
        );
        setOptions(rows);
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
  }, [debounced, excludeId, selectedIds]);

  function addContact(id: string) {
    if (selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
    setQuery("");
    setOptions([]);
  }

  function removeContact(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-heading mb-1">{label}</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-800"
            >
              {contactLabel(c)}
              {!disabled && (
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-800"
                  onClick={() => removeContact(c.id)}
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <>
          <input
            className="input-field w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts (min 2 chars)…"
          />
          {loading && <p className="text-xs text-body-muted mt-1">Searching…</p>}
          {options.length > 0 && (
            <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-[var(--card-border)] bg-white shadow-sm">
              {options.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => addContact(c.id)}
                  >
                    {contactLabel(c)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
