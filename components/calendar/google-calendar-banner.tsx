"use client";

import Link from "next/link";
import { useCalendarStatus } from "@/hooks/useIntegrationsStatus";

export function GoogleCalendarBanner() {
  const { data, isLoading } = useCalendarStatus();

  if (isLoading || data?.connected) return null;

  return (
    <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-heading flex flex-wrap items-center justify-between gap-2">
      <span>
        Connect your Google Calendar to sync meetings you create in ClickIn 360.
      </span>
      <Link
        href="/settings"
        className="font-medium text-[var(--secondary)] hover:underline shrink-0"
      >
        Connect in Settings →
      </Link>
    </div>
  );
}
