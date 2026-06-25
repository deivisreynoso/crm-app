"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { formatApiError } from "@/lib/validation-errors";
import {
  useCalendarStatus,
  useGmailStatus,
} from "@/hooks/useIntegrationsStatus";

type IntegrationStatus = "connected" | "available" | "not_configured";

function statusBadge(status: IntegrationStatus) {
  if (status === "connected") return "Connected";
  if (status === "not_configured") return "Setup required";
  return "Available";
}

function statusVariant(status: IntegrationStatus) {
  if (status === "connected") return "success" as const;
  if (status === "not_configured") return "neutral" as const;
  return "info" as const;
}

export function IntegrationsHub() {
  const searchParams = useSearchParams();
  const {
    data: gmail,
    isLoading: gmailLoading,
    refetch: refetchGmail,
  } = useGmailStatus();
  const {
    data: calendar,
    isLoading: calendarLoading,
    refetch: refetchCalendar,
  } = useCalendarStatus();

  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);
  const [disconnectingGmail, setDisconnectingGmail] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calendarParam = searchParams.get("google_calendar");
    if (calendarParam === "connected") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBanner(
        "Google Calendar connected. Meetings you create will sync to your calendar."
      );
      void refetchCalendar();
    } else if (calendarParam === "error") {
      setError("Google Calendar connection failed. Check OAuth settings and try again.");
    }

    const gmailParam = searchParams.get("google_gmail");
    if (gmailParam === "connected") {
      setBanner("Gmail connected. You can send and sync email from contact records.");
      void refetchGmail();
    } else if (gmailParam === "connected_no_read") {
      setError(
        "Gmail connected for sending only. Reconnect and approve all permissions to sync threads."
      );
      void refetchGmail();
    } else if (gmailParam === "error") {
      const reason = searchParams.get("reason");
      setError(
        reason === "migration"
          ? "Gmail authorized but credentials could not be saved. Run migration 018_google_gmail_tokens.sql, then reconnect."
          : "Gmail connection failed. Check redirect URI and OAuth settings."
      );
    }
  }, [searchParams, refetchCalendar, refetchGmail]);

  async function handleDisconnectCalendar() {
    setError(null);
    setDisconnectingCalendar(true);
    try {
      await axios.delete("/api/integrations/google-calendar/disconnect");
      setBanner("Google Calendar disconnected.");
      void refetchCalendar();
    } catch (err) {
      setError(formatApiError(err, "Could not disconnect"));
    } finally {
      setDisconnectingCalendar(false);
    }
  }

  async function handleDisconnectGmail() {
    setError(null);
    setDisconnectingGmail(true);
    try {
      await axios.delete("/api/integrations/gmail/disconnect");
      setBanner("Gmail disconnected.");
      void refetchGmail();
    } catch (err) {
      setError(formatApiError(err, "Could not disconnect"));
    } finally {
      setDisconnectingGmail(false);
    }
  }

  const gmailConnected = gmail?.connected ?? false;
  const gmailConfigured = gmail?.configured ?? true;
  const calendarConnected = calendar?.connected ?? false;
  const calendarConfigured = calendar?.configured ?? true;

  const gmailStatus: IntegrationStatus = !gmailConfigured
    ? "not_configured"
    : gmailConnected
      ? "connected"
      : "available";

  const calendarStatus: IntegrationStatus = !calendarConfigured
    ? "not_configured"
    : calendarConnected
      ? "connected"
      : "available";

  return (
    <div className="space-y-4">
      {banner && (
        <p className="text-sm text-emerald-700 bg-emerald-500/10 rounded-lg px-3 py-2">
          {banner}
        </p>
      )}
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-sm text-body-muted">
        Sign in with your workspace email, then connect <strong>your</strong> Google
        Workspace mailbox and calendar. Each teammate connects their own account; CRM
        data is shared across the team.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <IntegrationCard
          name="Gmail"
          description="Send quotes and contact emails from your company address. Sync email threads on the contact Emails tab when read access is granted."
          status={gmailLoading ? "available" : gmailStatus}
          actionLabel={
            !gmailConfigured
              ? "Not configured"
              : gmailConnected
                ? "Connected"
                : "Connect mailbox"
          }
          onAction={
            gmailConfigured && !gmailConnected
              ? () => {
                  window.location.href = "/api/auth/google-gmail";
                }
              : undefined
          }
          secondaryAction={
            gmailConnected && !gmail?.read_access
              ? {
                  label: "Reconnect for sync",
                  onClick: () => {
                    window.location.href = "/api/auth/google-gmail/reconnect";
                  },
                }
              : gmailConnected
                ? {
                    label: disconnectingGmail ? "Disconnecting…" : "Disconnect",
                    onClick: () => void handleDisconnectGmail(),
                    disabled: disconnectingGmail,
                  }
                : undefined
          }
          docsHint={
            gmail?.redirect_uri
              ? `Redirect URI (Google Cloud → Authorized redirect URIs):\n${gmail.redirect_uri}${
                  gmail.email ? `\n\nConnected as: ${gmail.email}` : ""
                }`
              : undefined
          }
          loading={gmailLoading}
        />

        <IntegrationCard
          name="Google Calendar"
          description="Sync meetings you schedule in ClickIn 360 to your Google Calendar."
          status={calendarLoading ? "available" : calendarStatus}
          actionLabel={
            !calendarConfigured
              ? "Not configured"
              : calendarConnected
                ? "Connected"
                : "Connect calendar"
          }
          onAction={
            calendarConfigured && !calendarConnected
              ? () => {
                  window.location.href = "/api/auth/google-calendar";
                }
              : undefined
          }
          secondaryAction={
            calendarConnected
              ? {
                  label: disconnectingCalendar ? "Disconnecting…" : "Disconnect",
                  onClick: () => void handleDisconnectCalendar(),
                  disabled: disconnectingCalendar,
                }
              : undefined
          }
          docsHint={
            calendar?.redirect_uri
              ? `Redirect URI:\n${calendar.redirect_uri}${
                  calendar.email ? `\n\nSigned in as: ${calendar.email}` : ""
                }`
              : undefined
          }
          loading={calendarLoading}
        />
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  status,
  actionLabel,
  onAction,
  secondaryAction,
  docsHint,
  loading,
}: {
  name: string;
  description: string;
  status: IntegrationStatus;
  actionLabel: string;
  onAction?: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  docsHint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-heading">{name}</h3>
        <Badge variant={statusVariant(status)}>{statusBadge(status)}</Badge>
      </div>
      <p className="text-sm text-body-muted flex-1">{description}</p>
      {docsHint && (
        <p className="text-xs text-body-muted whitespace-pre-wrap font-mono break-all">
          {docsHint}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {onAction ? (
          <Button
            type="button"
            size="sm"
            variant={status === "connected" ? "outline" : "default"}
            disabled={status === "not_configured" || loading}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        ) : (
          <span className="text-xs text-body-muted py-2">{actionLabel}</span>
        )}
        {secondaryAction && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={secondaryAction.disabled}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
