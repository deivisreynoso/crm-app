"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { getGreeting, getUserDisplayName } from "@/lib/user-display";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();
  const { data: prefs } = useNotificationPreferences();
  const { firstName } = getUserDisplayName(user);
  const greeting = useMemo(() => {
    const tz =
      prefs?.timezone?.trim() ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    return getGreeting(tz);
  }, [prefs?.timezone]);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();
    if (!q) return;
    router.push(`/contacts?search=${encodeURIComponent(q)}`);
  }

  return (
    <div className="flex flex-1 items-center gap-6 min-w-0">
      <div className="min-w-0 shrink-0 hidden md:block">
        <p className="text-base font-semibold text-heading">
          {greeting}, {firstName}
        </p>
        {user.email && (
          <p className="text-xs text-body-muted mt-0.5 truncate">{user.email}</p>
        )}
      </div>
      <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
            aria-hidden
          />
          <input
            name="q"
            type="search"
            placeholder="Search contacts…"
            className="input-field pl-9"
            aria-label="Search contacts"
          />
        </div>
      </form>
    </div>
  );
}
