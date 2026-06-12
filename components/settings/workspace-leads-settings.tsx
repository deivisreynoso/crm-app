"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FormLabel } from "@/components/ui/form-label";
import { Button } from "@/components/ui/button";
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { formatApiError } from "@/lib/validation-errors";

type Member = { id: string; label: string; email: string; role?: string };

function findElizabeth(members: Member[]): Member | undefined {
  return members.find((m) =>
    m.label.toLowerCase().includes("elizabeth reynoso")
  );
}

export function WorkspaceLeadsSettings() {
  const { data: settings, isLoading } = useWorkspaceSettings();
  const update = useUpdateWorkspaceSettings();
  const [members, setMembers] = useState<Member[]>([]);
  const [assignee, setAssignee] = useState("");
  const [emailNotify, setEmailNotify] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void axios.get<{ data: Member[] }>("/api/team/members").then((res) => {
      setMembers(res.data.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (settings?.default_sales_assignee) {
      setAssignee(settings.default_sales_assignee);
    } else {
      const elizabeth = findElizabeth(members);
      if (elizabeth) setAssignee(elizabeth.id);
    }
    setEmailNotify(settings?.website_leads_email_notify !== false);
  }, [settings?.default_sales_assignee, settings?.website_leads_email_notify, members]);

  const assignableMembers = members.filter(
    (m) => m.role === "owner" || m.role === "admin" || m.role === "sales"
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      await update.mutateAsync({
        default_sales_assignee: assignee || null,
        website_leads_email_notify: emailNotify,
      });
      setMsg("Website lead routing saved.");
    } catch (err) {
      setError(formatApiError(err, "Could not save lead settings"));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading…</p>;
  }

  const elizabethHint = findElizabeth(members);

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      <p className="text-sm text-body-muted">
        Website leads are stored in your shared workspace. Choose who gets assigned
        and notified when someone submits the booking form or completes an AI webchat
        conversation.
      </p>
      <div>
        <FormLabel>Default sales assignee</FormLabel>
        <select
          className="input-field w-full"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        >
          {assignableMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {!settings?.default_sales_assignee && elizabethHint && assignee === elizabethHint.id && (
          <p className="mt-1 text-xs text-body-muted">
            Elizabeth Reynoso is pre-selected as the default. Save to persist, or pick another teammate.
          </p>
        )}
      </div>
      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={emailNotify}
          onChange={(e) => setEmailNotify(e.target.checked)}
        />
        <span>
          Email the assignee when a new website lead arrives (in addition to in-app notification)
        </span>
      </label>
      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <Button type="submit" size="sm" disabled={update.isPending}>
        Save lead routing
      </Button>
    </form>
  );
}
