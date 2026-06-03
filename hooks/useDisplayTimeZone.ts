"use client";

import { useMemo } from "react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { resolveDisplayTimeZone } from "@/lib/utils/datetime";

/** Contact timezone, then user notification prefs, then browser local. */
export function useDisplayTimeZone(contactTimezone?: string | null) {
  const { data: prefs } = useNotificationPreferences();
  return useMemo(
    () =>
      resolveDisplayTimeZone(contactTimezone, prefs?.timezone) ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    [contactTimezone, prefs?.timezone]
  );
}
