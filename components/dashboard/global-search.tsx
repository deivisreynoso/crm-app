"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchResult = {
  type: "contact" | "account" | "ticket" | "opportunity";
  id: string;
  label: string;
  sublabel?: string;
  href: string;
};

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  contact: "Contact",
  account: "Account",
  ticket: "Ticket",
  opportunity: "Deal",
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get<{ data: SearchResult[] }>("/api/search", {
          params: { q: query.trim() },
        });
        setResults(data.data ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search contacts, accounts, tickets, deals…"
          className="input-field pl-9 h-10 w-full"
          aria-label="Global search"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>

      {open && (loading || results.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] shadow-lg overflow-hidden">
          {loading && (
            <p className="px-4 py-3 text-sm text-body-muted">Searching…</p>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                onClick={() => go(r.href)}
                className={cn(
                  "w-full text-left px-4 py-2.5 hover:bg-[var(--sidebar-hover)] transition-colors",
                  "border-b border-[var(--card-border)] last:border-b-0"
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-body-muted">
                  {TYPE_LABELS[r.type]}
                </span>
                <p className="text-sm font-medium text-heading">{r.label}</p>
                {r.sublabel && (
                  <p className="text-xs text-body-muted truncate">{r.sublabel}</p>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
