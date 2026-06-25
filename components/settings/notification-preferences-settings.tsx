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
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [conversationNotifs, setConversationNotifs] = useState(true);
  const [salesNotifs, setSalesNotifs] = useState(true);
  const [supportNotifs, setSupportNotifs] = useState(true);
  const [frequency, setFrequency] = useState("daily");

  useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTaskReminders(data.task_reminders);
    setOppReminders(data.opportunity_reminders);
    setTicketNotifs(data.ticket_notifications);
    setEmailNotifs(data.email_notifications ?? true);
    setConversationNotifs(data.conversation_notifications ?? true);
    setSalesNotifs(data.sales_notifications ?? true);
    setSupportNotifs(data.support_notifications ?? true);
    setFrequency(data.email_frequency);
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
        <label className="flex items-center gap-2 text-sm text-heading">
          <input
            type="checkbox"
            checked={emailNotifs}
            onChange={(e) => {
              setEmailNotifs(e.target.checked);
              void save({ email_notifications: e.target.checked });
            }}
          />
          Email replies from contacts
        </label>
        <label className="flex items-center gap-2 text-sm text-heading">
          <input
            type="checkbox"
            checked={salesNotifs}
            onChange={(e) => {
              setSalesNotifs(e.target.checked);
              void save({ sales_notifications: e.target.checked });
            }}
          />
          Sales group events (leads, invoice payments, quote responses)
        </label>
        <label className="flex items-center gap-2 text-sm text-heading">
          <input
            type="checkbox"
            checked={supportNotifs}
            onChange={(e) => {
              setSupportNotifs(e.target.checked);
              void save({ support_notifications: e.target.checked });
            }}
          />
          Support group events (new service tickets)
        </label>
        <label className="flex items-center gap-2 text-sm text-heading">
          <input
            type="checkbox"
            checked={conversationNotifs}
            onChange={(e) => {
              setConversationNotifs(e.target.checked);
              void save({ conversation_notifications: e.target.checked });
            }}
          />
          WhatsApp and webchat conversations needing review
        </label>
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
