"use client";

import { useMemo } from "react";
import { getGreeting } from "@/lib/user-display";
import { useViewerTimeZone } from "@/hooks/useViewerTimeZone";

/** Time-of-day greeting using user prefs timezone, then browser local. */
export function DashboardGreeting({ firstName }: { firstName: string }) {
  const timeZone = useViewerTimeZone();
  const greeting = useMemo(() => getGreeting(timeZone), [timeZone]);

  return (
    <>
      {greeting}, {firstName}
    </>
  );
}
