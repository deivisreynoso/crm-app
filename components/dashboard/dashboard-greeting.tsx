"use client";

import { useMemo } from "react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { getGreeting } from "@/lib/user-display";

/** Time-of-day greeting using user prefs timezone, then browser local. */
export function DashboardGreeting({ firstName }: { firstName: string }) {
  const { data: prefs } = useNotificationPreferences();
  const greeting = useMemo(() => {
    const tz =
      prefs?.timezone?.trim() ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    return getGreeting(tz);
  }, [prefs?.timezone]);

  return (
    <>
      {greeting}, {firstName}
    </>
  );
}
