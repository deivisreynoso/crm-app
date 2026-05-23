"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

export function GoogleCalendarBanner() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    void axios
      .get<{ connected: boolean; configured: boolean }>(
        "/api/integrations/google-calendar/status"
      )
      .then((res) => setConnected(res.data.connected))
      .catch(() => setConnected(false));
  }, []);

  if (connected === null || connected) return null;

  return (
    <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-heading flex flex-wrap items-center justify-between gap-2">
      <span>
        Connect Google Calendar to sync meetings from ClickIn 360 to your Google
        account.
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
