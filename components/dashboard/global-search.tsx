"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const router = useRouter();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();
    if (!q) return;
    router.push(`/contacts?search=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative w-full">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
          aria-hidden
        />
        <input
          name="q"
          type="search"
          placeholder="Search contacts…"
          className="input-field pl-9 h-10"
          aria-label="Search contacts"
        />
      </div>
    </form>
  );
}
