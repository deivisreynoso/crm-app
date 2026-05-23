"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";

export function GoogleCalendarSettings() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void axios
      .get<{ connected: boolean }>("/api/integrations/google-calendar/status")
      .then((res) => setConnected(res.data.connected))
      .catch(() => setConnected(false));
  }, []);

  function handleConnect() {
    setError(null);
    window.location.href = "/api/auth/google-calendar";
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-body-muted">
        Connect Google Calendar to sync meetings created in ClickIn 360. Requires{" "}
        <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
        <code className="text-xs">GOOGLE_CALENDAR_REDIRECT_URI</code> in your environment.
      </p>
      {connected === true && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Google Calendar is connected.
        </p>
      )}
      {connected === false && (
        <Button type="button" size="sm" variant="outline" onClick={handleConnect}>
          Connect Google Calendar
        </Button>
      )}
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
