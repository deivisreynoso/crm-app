"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import type { BookingAvailabilityConfig } from "@/lib/website/booking-availability";
import { DEFAULT_BOOKING_AVAILABILITY } from "@/lib/website/booking-availability";
import { formatApiError } from "@/lib/validation-errors";

const DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const TIMEZONES = [
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Chicago", label: "US Central" },
  { value: "America/Los_Angeles", label: "US Pacific" },
];

export function BookingAvailabilitySettings() {
  const { data: settings, isLoading } = useWorkspaceSettings();
  const update = useUpdateWorkspaceSettings();
  const [config, setConfig] = useState<BookingAvailabilityConfig>(DEFAULT_BOOKING_AVAILABILITY);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.booking_availability) {
      setConfig(settings.booking_availability);
    }
  }, [settings?.booking_availability]);

  function toggleDay(day: number) {
    setConfig((c) => ({
      ...c,
      days: c.days.includes(day) ? c.days.filter((d) => d !== day) : [...c.days, day],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      await update.mutateAsync({ booking_availability: config });
      setMsg("Booking availability saved.");
    } catch (err) {
      setError(formatApiError(err, "Could not save availability"));
    }
  }

  if (isLoading) return <p className="text-sm text-body-muted">Loading…</p>;

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      <p className="text-sm text-body-muted">
        Controls which dates and times visitors can request on the public booking form.
      </p>

      <div>
        <FormLabel>Timezone</FormLabel>
        <select
          className="input-field w-full"
          value={config.timezone}
          onChange={(e) => setConfig((c) => ({ ...c, timezone: e.target.value }))}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FormLabel>Available days</FormLabel>
        <div className="flex flex-wrap gap-2 mt-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                config.days.includes(d.value)
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "bg-[var(--card)] text-body-muted border-[var(--card-border)]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel>Start time</FormLabel>
          <input
            type="time"
            className="input-field w-full"
            value={config.start_time}
            onChange={(e) => setConfig((c) => ({ ...c, start_time: e.target.value }))}
          />
        </div>
        <div>
          <FormLabel>End time</FormLabel>
          <input
            type="time"
            className="input-field w-full"
            value={config.end_time}
            onChange={(e) => setConfig((c) => ({ ...c, end_time: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel>Meeting duration (minutes)</FormLabel>
          <select
            className="input-field w-full"
            value={config.meeting_duration_minutes}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                meeting_duration_minutes: Number(e.target.value),
              }))
            }
          >
            {[15, 30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
        <div>
          <FormLabel>Buffer between meetings (minutes)</FormLabel>
          <select
            className="input-field w-full"
            value={config.buffer_minutes}
            onChange={(e) =>
              setConfig((c) => ({ ...c, buffer_minutes: Number(e.target.value) }))
            }
          >
            {[0, 5, 10, 15, 30].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel>Minimum notice (hours)</FormLabel>
          <input
            type="number"
            min={0}
            max={168}
            className="input-field w-full"
            value={config.min_notice_hours}
            onChange={(e) =>
              setConfig((c) => ({ ...c, min_notice_hours: Number(e.target.value) }))
            }
          />
        </div>
        <div>
          <FormLabel>Book up to (days ahead)</FormLabel>
          <input
            type="number"
            min={1}
            max={90}
            className="input-field w-full"
            value={config.max_days_ahead}
            onChange={(e) =>
              setConfig((c) => ({ ...c, max_days_ahead: Number(e.target.value) }))
            }
          />
        </div>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <Button type="submit" size="sm" disabled={update.isPending}>
        Save availability
      </Button>
    </form>
  );
}
