"use client";

import { useEffect, useState } from "react";
import { FormLabel } from "@/components/ui/form-label";
import { Button } from "@/components/ui/button";
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { formatApiError } from "@/lib/validation-errors";

export function WorkspaceLeadsSettings() {
  const { data: settings, isLoading } = useWorkspaceSettings();
  const update = useUpdateWorkspaceSettings();
  const [salesGroupEmail, setSalesGroupEmail] = useState("sales@clickin360.com");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSalesGroupEmail(settings?.sales_group_email ?? "sales@clickin360.com");
  }, [settings?.sales_group_email]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      await update.mutateAsync({
        default_sales_assignee: null,
        website_leads_email_notify: true,
        sales_group_email: salesGroupEmail.trim() || "sales@clickin360.com",
      });
      setMsg("Sales group routing saved.");
    } catch (err) {
      setError(formatApiError(err, "Could not save lead settings"));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading…</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      <p className="text-sm text-body-muted">
        Website, webchat, and WhatsApp leads stay in the shared sales queue
        (unassigned contacts and opportunities). The sales group is emailed only
        when a visitor books a discovery call or requests a human agent.
      </p>
      <div>
        <FormLabel>Sales group email</FormLabel>
        <input
          type="email"
          className="input-field w-full mt-1"
          value={salesGroupEmail}
          onChange={(e) => setSalesGroupEmail(e.target.value)}
          placeholder="sales@clickin360.com"
        />
        <p className="mt-1 text-xs text-body-muted">
          Receives sales alerts: booked discovery calls, human chat requests,
          invoice payments via payment links, and quote accept/decline responses.
          In-app notifications go to all sales team members.
        </p>
      </div>
      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <Button type="submit" size="sm" disabled={update.isPending}>
        Save sales group
      </Button>
    </form>
  );
}
