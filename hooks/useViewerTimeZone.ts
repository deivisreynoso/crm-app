"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotificationPreferences";
import { browserTimeZone, resolveViewerTimeZone } from "@/lib/utils/datetime";
import { isAutoDisplayTimezone } from "@/lib/constants/display-timezones";

const TIMEZONE_SEEDED_KEY = "clickin-viewer-timezone-seeded";

function subscribeToTimezone() {
  return () => {};
}

/** Timezone for the person viewing the CRM (not the contact on the record). */
export function useViewerTimeZone() {
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const browserTz = useSyncExternalStore(
    subscribeToTimezone,
    browserTimeZone,
    () => "UTC"
  );

  const timeZone = useMemo(
    () => resolveViewerTimeZone(prefs?.timezone, browserTz),
    [prefs?.timezone, browserTz]
  );

  useEffect(() => {
    if (!prefs || !isAutoDisplayTimezone(prefs.timezone)) return;
    if (browserTz === "UTC") return;
    if (window.localStorage.getItem(TIMEZONE_SEEDED_KEY)) return;

    void update
      .mutateAsync({ timezone: browserTz })
      .then(() => {
        window.localStorage.setItem(TIMEZONE_SEEDED_KEY, "1");
      })
      .catch(() => {
        /* display still uses browser via resolveViewerTimeZone */
      });
  }, [prefs, browserTz, update]);

  return timeZone;
}
