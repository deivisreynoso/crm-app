"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_APPOINTMENT_REMINDER_SETTINGS,
  DEFAULT_ONBOARDING_TASK_TEMPLATE,
} from "@/lib/onboarding/defaults";
import { OUTBOUND_WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { ProjectStagesSettingsPanel } from "@/components/settings/project-stages-settings";

type AutomationsSettings = {
  outbound_webhook_url: string;
  outbound_webhook_secret: string;
  outbound_webhook_events: string[];
  available_webhook_events: string[];
  onboarding_enabled: boolean;
  onboarding_task_template: unknown[];
  appointment_reminder_settings: {
    enabled: boolean;
    reminders_hours_before: number[];
    email_enabled: boolean;
    whatsapp_enabled: boolean;
  };
  quote_default_expiry_days: number;
  loss_reason_options: unknown[];
  session_timeout_hours: number | null;
};

function useAutomationsSettings() {
  return useQuery({
    queryKey: ["automations-settings"],
    queryFn: async () => {
      const { data } = await axios.get<AutomationsSettings>("/api/settings/automations");
      return data;
    },
  });
}

export function WebhooksSettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAutomationsSettings();
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(data.outbound_webhook_url ?? "");
    setSecret(data.outbound_webhook_secret ?? "");
    setEvents(data.outbound_webhook_events ?? []);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      axios.patch("/api/settings/automations", {
        outbound_webhook_url: url,
        outbound_webhook_secret: secret,
        outbound_webhook_events: events,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return <p className="text-sm text-body-muted">Loading webhook settings…</p>;

  const available = data?.available_webhook_events ?? OUTBOUND_WEBHOOK_EVENTS;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <label className="block text-sm font-medium text-heading mb-1">Webhook URL</label>
        <input
          className="w-full rounded-md border border-[var(--card-border)] px-3 py-2 text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://n8n.example.com/webhook/crm-events"
        />
        <p className="text-xs text-body-muted mt-1">
          CRM sends POST requests with header <code>x-crm-webhook-secret</code>.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-heading mb-1">Webhook secret</label>
        <input
          type="password"
          className="w-full rounded-md border border-[var(--card-border)] px-3 py-2 text-sm"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Optional — falls back to CRM_OUTBOUND_WEBHOOK_SECRET"
        />
      </div>
      <div>
        <p className="text-sm font-medium text-heading mb-2">Enabled events</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {available.map((event) => (
            <label key={event} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={events.length === 0 || events.includes(event)}
                onChange={(e) => {
                  if (events.length === 0) {
                    setEvents(
                      available.filter((ev) => ev === event || e.target.checked && ev === event)
                    );
                    return;
                  }
                  setEvents((prev) =>
                    e.target.checked
                      ? [...new Set([...prev, event])]
                      : prev.filter((ev) => ev !== event)
                  );
                }}
              />
              {event}
            </label>
          ))}
        </div>
        <p className="text-xs text-body-muted mt-1">Leave all checked to fire every event.</p>
      </div>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving…" : saved ? "Saved" : "Save webhooks"}
      </Button>
    </form>
  );
}

export function OnboardingSettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAutomationsSettings();
  const [enabled, setEnabled] = useState(true);
  const [templateJson, setTemplateJson] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(data.onboarding_enabled ?? true);
    setTemplateJson(
      JSON.stringify(data.onboarding_task_template ?? DEFAULT_ONBOARDING_TASK_TEMPLATE, null, 2)
    );
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      let template: unknown[];
      try {
        template = JSON.parse(templateJson) as unknown[];
      } catch {
        throw new Error("Task template must be valid JSON.");
      }
      return axios.patch("/api/settings/automations", {
        onboarding_enabled: enabled,
        onboarding_task_template: template,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return <p className="text-sm text-body-muted">Loading onboarding settings…</p>;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enable onboarding automation
      </label>
      <div>
        <label className="block text-sm font-medium text-heading mb-1">
          Bilingual task template (JSON)
        </label>
        <textarea
          className="w-full min-h-[220px] rounded-md border border-[var(--card-border)] px-3 py-2 text-xs font-mono"
          value={templateJson}
          onChange={(e) => setTemplateJson(e.target.value)}
        />
      </div>
      {save.isError ? (
        <p className="text-sm text-red-600">{(save.error as Error).message}</p>
      ) : null}
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving…" : saved ? "Saved" : "Save onboarding"}
      </Button>
    </form>
  );
}

export function AppointmentRemindersSettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAutomationsSettings();
  const [settings, setSettings] = useState(DEFAULT_APPOINTMENT_REMINDER_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.appointment_reminder_settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(data.appointment_reminder_settings);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      axios.patch("/api/settings/automations", {
        appointment_reminder_settings: settings,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return <p className="text-sm text-body-muted">Loading reminder settings…</p>;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
        />
        Enable appointment reminder webhooks
      </label>
      <div>
        <label className="block text-sm font-medium text-heading mb-1">
          Remind hours before (comma-separated)
        </label>
        <input
          className="w-full rounded-md border border-[var(--card-border)] px-3 py-2 text-sm"
          value={settings.reminders_hours_before.join(", ")}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              reminders_hours_before: e.target.value
                .split(",")
                .map((v) => Number(v.trim()))
                .filter((n) => n > 0),
            }))
          }
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.email_enabled}
          onChange={(e) => setSettings((s) => ({ ...s, email_enabled: e.target.checked }))}
        />
        Email reminders (via N8N / Mailgun)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.whatsapp_enabled}
          onChange={(e) => setSettings((s) => ({ ...s, whatsapp_enabled: e.target.checked }))}
        />
        WhatsApp reminders (via N8N)
      </label>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving…" : saved ? "Saved" : "Save reminders"}
      </Button>
    </form>
  );
}

export function QuoteExpirySettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAutomationsSettings();
  const [expiryDays, setExpiryDays] = useState(30);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setExpiryDays(data.quote_default_expiry_days ?? 30);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      axios.patch("/api/settings/automations", {
        quote_default_expiry_days: expiryDays,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="block text-sm font-medium text-heading">Default quote expiry (days)</label>
      <input
        type="number"
        min={1}
        max={365}
        className="w-32 rounded-md border border-[var(--card-border)] px-3 py-2 text-sm"
        value={expiryDays}
        onChange={(e) => setExpiryDays(Number(e.target.value))}
      />
      <Button type="submit" size="sm" disabled={save.isPending}>
        {saved ? "Saved" : "Save"}
      </Button>
    </form>
  );
}

export function LossReasonSettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAutomationsSettings();
  const [json, setJson] = useState("[]");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.loss_reason_options) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJson(JSON.stringify(data.loss_reason_options, null, 2));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const options = JSON.parse(json) as unknown[];
      return axios.patch("/api/settings/automations", { loss_reason_options: options });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="block text-sm font-medium text-heading">Loss reason options (JSON)</label>
      <textarea
        className="w-full min-h-[160px] rounded-md border border-[var(--card-border)] px-3 py-2 text-xs font-mono"
        value={json}
        onChange={(e) => setJson(e.target.value)}
      />
      <Button type="submit" size="sm" disabled={save.isPending}>
        {saved ? "Saved" : "Save loss reasons"}
      </Button>
    </form>
  );
}

export function SessionTimeoutSettingsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAutomationsSettings();
  const [hours, setHours] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHours(data.session_timeout_hours != null ? String(data.session_timeout_hours) : "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      axios.patch("/api/settings/automations", {
        session_timeout_hours: hours.trim() ? Number(hours) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="block text-sm font-medium text-heading">
        Session timeout (hours, blank = disabled)
      </label>
      <input
        type="number"
        min={1}
        max={168}
        className="w-32 rounded-md border border-[var(--card-border)] px-3 py-2 text-sm"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        placeholder="8"
      />
      <Button type="submit" size="sm" disabled={save.isPending}>
        {saved ? "Saved" : "Save timeout"}
      </Button>
    </form>
  );
}

export function AutomationsSettingsSection() {
  const [tab, setTab] = useState<
    "webhooks" | "onboarding" | "reminders" | "quotes" | "session" | "project-stages"
  >("webhooks");

  const tabs = [
    { id: "webhooks" as const, label: "Webhooks" },
    { id: "onboarding" as const, label: "Onboarding" },
    { id: "project-stages" as const, label: "Project stages" },
    { id: "reminders" as const, label: "Appointment reminders" },
    { id: "quotes" as const, label: "Quotes & loss reasons" },
    { id: "session" as const, label: "Session timeout" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-sm border ${
              tab === t.id
                ? "bg-primary text-white border-primary"
                : "border-[var(--card-border)] text-body-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "webhooks" ? <WebhooksSettingsPanel /> : null}
      {tab === "onboarding" ? <OnboardingSettingsPanel /> : null}
      {tab === "project-stages" ? <ProjectStagesSettingsPanel /> : null}
      {tab === "reminders" ? <AppointmentRemindersSettingsPanel /> : null}
      {tab === "quotes" ? (
        <div className="space-y-6">
          <QuoteExpirySettingsPanel />
          <LossReasonSettingsPanel />
        </div>
      ) : null}
      {tab === "session" ? <SessionTimeoutSettingsPanel /> : null}
    </div>
  );
}
