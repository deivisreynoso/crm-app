"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FormLabel } from "@/components/ui/form-label";
import { Button } from "@/components/ui/button";
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { formatApiError } from "@/lib/validation-errors";

type Member = { id: string; label: string; email: string; role?: string };

export function WorkspaceLeadsSettings() {
  const { data: settings, isLoading } = useWorkspaceSettings();
  const update = useUpdateWorkspaceSettings();
  const [members, setMembers] = useState<Member[]>([]);
  const [assignee, setAssignee] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void axios.get<{ data: Member[] }>("/api/team/members").then((res) => {
      setMembers(res.data.data ?? []);
    });
  }, []);

  useEffect(() => {
    setAssignee(settings?.default_sales_assignee ?? "");
  }, [settings?.default_sales_assignee]);

  const salesOptions = members.filter((m) => m.role === "sales" || m.role === "owner");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      await update.mutateAsync({
        default_sales_assignee: assignee || null,
      });
      setMsg("Website lead assignment saved.");
    } catch (err) {
      setError(formatApiError(err, "Could not save lead settings"));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading…</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 max-w-lg">
      <p className="text-sm text-body-muted">
        Website leads are stored in your shared workspace. Choose who gets auto-assigned
        when someone submits the booking form (optional until your sales partner joins).
      </p>
      <div>
        <FormLabel>Default sales assignee</FormLabel>
        <select
          className="input-field w-full"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        >
          <option value="">Unassigned (visible to whole workspace)</option>
          {salesOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <Button type="submit" size="sm" disabled={update.isPending}>
        Save lead routing
      </Button>
    </form>
  );
}
