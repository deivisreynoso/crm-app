"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { formatApiError } from "@/lib/validation-errors";

type SupportWidgetSettings = {
  support_widget_enabled: boolean;
  support_widget_assignee: string | null;
  support_widget_email_notify: boolean;
  support_url: string;
  embed_code: string;
};

type TeamMember = { id: string; label: string };

export function SupportWidgetSettings() {
  const [settings, setSettings] = useState<SupportWidgetSettings | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [settingsRes, membersRes] = await Promise.all([
      axios.get<{ data: SupportWidgetSettings }>("/api/settings/support-widget"),
      axios.get<{ data: TeamMember[] }>("/api/team/members"),
    ]);
    setSettings(settingsRes.data.data);
    setMembers(membersRes.data.data ?? []);
  }, []);

  useEffect(() => {
    void load().catch(() => setSettings(null));
  }, [load]);

  async function save(patch: Partial<SupportWidgetSettings>) {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await axios.patch("/api/settings/support-widget", patch);
      setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
      setMsg("Saved.");
    } catch (err) {
      setError(formatApiError(err, "Could not save"));
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <p className="text-sm text-body-muted">Loading support widget settings…</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      {error && (
        <p className="text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {msg && (
        <p className="text-emerald-700 bg-emerald-500/10 border border-emerald-200 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.support_widget_enabled}
          onChange={(e) => void save({ support_widget_enabled: e.target.checked })}
          disabled={saving}
        />
        <span>
          Enable public support page (
          <a href={settings.support_url} className="text-[var(--primary)] underline" target="_blank" rel="noreferrer">
            EN
          </a>
          {" · "}
          <a
            href={settings.support_url.replace("/en/", "/es/")}
            className="text-[var(--primary)] underline"
            target="_blank"
            rel="noreferrer"
          >
            ES
          </a>
          )
        </span>
      </label>

      <div>
        <FormLabel htmlFor="support-assignee">Default assignee for widget tickets</FormLabel>
        <select
          id="support-assignee"
          className="input-field w-full mt-1"
          value={settings.support_widget_assignee ?? ""}
          onChange={(e) =>
            void save({
              support_widget_assignee: e.target.value || null,
            })
          }
          disabled={saving}
        >
          <option value="">Workspace owner (default)</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.support_widget_email_notify}
          onChange={(e) => void save({ support_widget_email_notify: e.target.checked })}
          disabled={saving}
        />
        <span>Send confirmation email to customer via Mailgun ({`no-reply@clickin360.com`})</span>
      </label>

      <div>
        <FormLabel>Embed code</FormLabel>
        <textarea
          className="input-field w-full mt-1 font-mono text-xs min-h-[80px]"
          readOnly
          value={settings.embed_code}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => void navigator.clipboard.writeText(settings.embed_code)}
        >
          Copy embed code
        </Button>
      </div>
    </div>
  );
}
