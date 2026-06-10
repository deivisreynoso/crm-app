"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";

export function MfaSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void axios
      .get<{ enabled: boolean }>("/api/account/mfa")
      .then((res) => setEnabled(res.data.enabled))
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, []);

  async function toggle() {
    setSaving(true);
    setMsg(null);
    try {
      const next = !enabled;
      await axios.patch("/api/account/mfa", { enabled: next });
      setEnabled(next);
      setMsg(
        next
          ? "MFA preference saved. Complete enrollment in your authenticator app when prompted at next sign-in."
          : "MFA disabled for your account."
      );
    } catch {
      setMsg("Could not update MFA setting.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-body-muted">Loading…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-body-muted">
        Optional two-factor authentication adds an extra step when signing in.
      </p>
      <Button type="button" size="sm" variant={enabled ? "outline" : "default"} disabled={saving} onClick={() => void toggle()}>
        {saving ? "Saving…" : enabled ? "Disable MFA" : "Enable MFA"}
      </Button>
      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
    </div>
  );
}
