"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { signOut, useSession } from "next-auth/react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/** Warn before workspace session timeout; sign out when expired. */
export function SessionTimeoutGuard() {
  const { data: session } = useSession();
  const [timeoutHours, setTimeoutHours] = useState<number | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);

  useEffect(() => {
    axios
      .get<{ session_timeout_hours: number | null }>("/api/session/policy")
      .then((res) => setTimeoutHours(res.data.session_timeout_hours))
      .catch(() => setTimeoutHours(null));
  }, []);

  useEffect(() => {
    if (!session || !timeoutHours || timeoutHours <= 0) return;

    const maxMs = timeoutHours * 60 * 60 * 1000;
    const warnMs = maxMs - 5 * 60 * 1000;
    const sessionStart = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - sessionStart;
      if (elapsed >= maxMs) {
        void signOut({ callbackUrl: "/login?error=session_expired" });
        return;
      }
      if (elapsed >= warnMs) setWarnOpen(true);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [session, timeoutHours]);

  if (!warnOpen) return null;

  return (
    <Modal open={warnOpen} onClose={() => setWarnOpen(false)} title="Session expiring soon">
      <p className="text-sm text-body-muted mb-4">
        Your session will expire soon due to workspace inactivity policy. Save your work and stay
        active to remain signed in.
      </p>
      <Button onClick={() => setWarnOpen(false)}>Stay signed in</Button>
    </Modal>
  );
}
