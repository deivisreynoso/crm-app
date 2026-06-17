"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import {
  AUTO_DISPLAY_TIMEZONE,
  DISPLAY_TIMEZONE_OPTIONS,
  formatCurrentClockPreview,
  formatDisplayTimezoneLabel,
  storedTimezoneToSelectValue,
} from "@/lib/constants/display-timezones";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotificationPreferences";
import { browserTimeZone, resolveViewerTimeZone } from "@/lib/utils/datetime";
import { formatApiError } from "@/lib/validation-errors";

const GROUP_ORDER = ["Auto", "Americas", "Europe & Africa", "Other"] as const;

export function DisplayTimezoneSettings() {
  const { data, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selected, setSelected] = useState(AUTO_DISPLAY_TIMEZONE);
  const browserTz = browserTimeZone();

  useEffect(() => {
    if (!data) return;
    setSelected(storedTimezoneToSelectValue(data.timezone));
  }, [data]);

  const effectiveTimeZone = useMemo(
    () => resolveViewerTimeZone(data?.timezone, browserTz),
    [data?.timezone, browserTz]
  );

  const preview = formatCurrentClockPreview(effectiveTimeZone);

  const groupedOptions = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        options: DISPLAY_TIMEZONE_OPTIONS.filter((o) => o.group === group),
      })).filter((g) => g.options.length > 0),
    []
  );

  async function saveTimezone(value: string) {
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ timezone: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(formatApiError(err, "Could not save timezone"));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading…</p>;
  }

  const savedLabel = data?.timezone
    ? formatDisplayTimezoneLabel(data.timezone, browserTz)
    : "Device timezone";

  return (
    <div className="space-y-4 max-w-md">
      <p className="text-sm text-body-muted">
        Calendar events, activity timelines, and other dates in the CRM are shown
        in this timezone.
      </p>

      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div>
        <FormLabel htmlFor="display-timezone">Timezone</FormLabel>
        <select
          id="display-timezone"
          className="input-field w-full mt-1"
          value={selected}
          disabled={update.isPending}
          onChange={(e) => {
            const value = e.target.value;
            setSelected(value);
            void saveTimezone(value);
          }}
        >
          {groupedOptions.map(({ group, options }) => (
            <optgroup key={group} label={group}>
              {options.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-body-muted mt-2">
          Currently showing times as{" "}
          <span className="font-medium text-heading">{savedLabel}</span>
          {preview ? (
            <>
              {" "}
              · now {preview}
            </>
          ) : null}
        </p>
        {selected === AUTO_DISPLAY_TIMEZONE && (
          <p className="text-xs text-body-muted mt-1">
            Device timezone: {browserTz.replace(/_/g, " ")}
          </p>
        )}
      </div>

      {saved && (
        <span className="text-xs font-medium text-emerald-700">Saved</span>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={update.isPending}
        onClick={() => {
          setSelected(AUTO_DISPLAY_TIMEZONE);
          void saveTimezone(AUTO_DISPLAY_TIMEZONE);
        }}
      >
        Reset to device timezone
      </Button>
    </div>
  );
}
