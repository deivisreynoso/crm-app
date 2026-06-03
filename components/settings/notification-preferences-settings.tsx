"use client";

import { useEffect, useState } from "react";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotificationPreferences";
import { formatApiError } from "@/lib/validation-errors";

export function NotificationPreferencesSettings() {
  const { data, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [taskReminders, setTaskReminders] = useState(true);
  const [oppReminders, setOppReminders] = useState(true);
  const [ticketNotifs, setTicketNotifs] = useState(true);
  const [frequency, setFrequency] = useState("daily");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    if (!data) return;
    setTaskReminders(data.task_reminders);
    setOppReminders(data.opportunity_reminders);
    setTicketNotifs(data.ticket_notifications);
    setFrequency(data.email_frequency);
    setTimezone(data.timezone || "UTC");
  }, [data]);

  async function save(patch: Parameters<typeof update.mutateAsync>[0]) {
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(formatApiError(err, "Could not save"));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        Choose what generates in-app notifications and email digests.
      </p>
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-heading">
          <input
            type="checkbox"
            checked={taskReminders}
            onChange={(e) => {
              setTaskReminders(e.target.checked);
              void save({ task_reminders: e.target.checked });
            }}
          />
          Task reminders
        </label>
        <label className="flex items-center gap-2 text-sm text-heading">
          <input
            type="checkbox"
            checked={oppReminders}
            onChange={(e) => {
              setOppReminders(e.target.checked);
              void save({ opportunity_reminders: e.target.checked });
            }}
          />
          Opportunity reminders
        </label>
        <label className="flex items-center gap-2 text-sm text-heading">
          <input
            type="checkbox"
            checked={ticketNotifs}
            onChange={(e) => {
              setTicketNotifs(e.target.checked);
              void save({ ticket_notifications: e.target.checked });
            }}
          />
          Service ticket updates
        </label>
      </div>
      <div>
        <label className="text-xs font-medium text-body-muted block mb-1">
          Display time zone
        </label>
        <input
          className="input-field max-w-md"
          value={timezone}
          placeholder="America/Mexico_City"
          disabled={update.isPending}
          onChange={(e) => setTimezone(e.target.value)}
          onBlur={() => {
            if (timezone.trim()) {
              void save({ timezone: timezone.trim() });
            }
          }}
        />
        <p className="text-xs text-body-muted mt-1">
          Used for activity timelines when a contact has no time zone set.
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-body-muted block mb-1">
          Email digest
        </label>
        <select
          className="input-field max-w-xs"
          value={frequency}
          disabled={update.isPending}
          onChange={(e) => {
            setFrequency(e.target.value);
            void save({
              email_frequency: e.target.value as
                | "instant"
                | "daily"
                | "weekly"
                | "off",
            });
          }}
        >
          <option value="instant">Instant</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="off">Off</option>
        </select>
      </div>
      {saved && (
        <span className="text-xs font-medium text-emerald-700">Saved</span>
      )}
    </div>
  );
}
