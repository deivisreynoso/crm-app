"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { formatApiError } from "@/lib/validation-errors";
import { useGoogleWorkspaceSetup } from "@/hooks/useGoogleWorkspace";
import {
  useCalendarStatus,
  useGmailStatus,
} from "@/hooks/useIntegrationsStatus";
import { useGoogleDriveStatus, useDisconnectGoogleDrive } from "@/hooks/useGoogleDrive";

type CardStatus = "connected" | "available" | "not_configured";

function GoogleWorkspacePanelInner() {
  const searchParams = useSearchParams();
  const { data: setup, isLoading: setupLoading, refetch: refetchSetup } =
    useGoogleWorkspaceSetup();
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
  const {
    data: drive,
    isLoading: driveLoading,
    refetch: refetchDrive,
  } = useGoogleDriveStatus();
  const disconnectDrive = useDisconnectGoogleDrive();

  const [disconnectingGmail, setDisconnectingGmail] = useState(false);
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);
  const [disconnectingDrive, setDisconnectingDrive] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calendarParam = searchParams.get("google_calendar");
    if (calendarParam === "connected") {
      setBanner("Google Calendar connected.");
      void refetchCalendar();
      void refetchSetup();
    } else if (calendarParam === "error") {
      setError("Google Calendar connection failed. Check OAuth settings and try again.");
    }

    const gmailParam = searchParams.get("google_gmail");
    if (gmailParam === "connected") {
      setBanner("Gmail connected. You can send and sync email from contact records.");
      void refetchGmail();
      void refetchSetup();
    } else if (gmailParam === "connected_no_read") {
      setError(
        "Gmail connected for sending only. Reconnect and approve all permissions to sync threads."
      );
      void refetchGmail();
      void refetchSetup();
    } else if (gmailParam === "error") {
      const reason = searchParams.get("reason");
      setError(
        reason === "migration"
          ? "Gmail authorized but tokens could not be saved. Run migration 018_google_gmail_tokens.sql, then reconnect."
          : "Gmail connection failed. Check redirect URI and OAuth settings."
      );
    }

    const driveParam = searchParams.get("google_drive");
    if (driveParam === "connected") {
      setBanner("Google Drive connected for this workspace.");
      void refetchDrive();
      void refetchSetup();
    } else if (driveParam === "error") {
      const reason = searchParams.get("reason");
      setError(
        reason === "migration"
          ? "Drive authorized but tokens could not be saved. Run migration 069_google_drive_integration.sql, then reconnect."
          : "Google Drive connection failed. Check redirect URI and OAuth settings."
      );
    }
  }, [searchParams, refetchCalendar, refetchGmail, refetchDrive, refetchSetup]);

  async function handleDisconnectGmail() {
    setError(null);
    setDisconnectingGmail(true);
    try {
      await axios.delete("/api/integrations/gmail/disconnect");
      setBanner("Gmail disconnected.");
      void refetchGmail();
      void refetchSetup();
    } catch (err) {
      setError(formatApiError(err, "Could not disconnect Gmail"));
    } finally {
      setDisconnectingGmail(false);
    }
  }

  async function handleDisconnectCalendar() {
    setError(null);
    setDisconnectingCalendar(true);
    try {
      await axios.delete("/api/integrations/google-calendar/disconnect");
      setBanner("Google Calendar disconnected.");
      void refetchCalendar();
      void refetchSetup();
    } catch (err) {
      setError(formatApiError(err, "Could not disconnect Calendar"));
    } finally {
      setDisconnectingCalendar(false);
    }
  }

  if (setupLoading) {
    return <p className="text-sm text-body-muted">Loading Google Workspace…</p>;
  }

  const oauthConfigured = setup?.oauth_configured ?? false;
  const gmailConnected = gmail?.connected ?? false;
  const calendarConnected = calendar?.connected ?? false;
  const driveConnected = drive?.connected ?? false;

  const gmailStatus: CardStatus = !oauthConfigured
    ? "not_configured"
    : gmailConnected
      ? "connected"
      : "available";

  const calendarStatus: CardStatus = !oauthConfigured
    ? "not_configured"
    : calendarConnected
      ? "connected"
      : "available";

  const driveStatus: CardStatus = !oauthConfigured
    ? "not_configured"
    : driveConnected
      ? "connected"
      : "available";

  async function handleDisconnectDrive() {
    setError(null);
    setDisconnectingDrive(true);
    try {
      await disconnectDrive.mutateAsync();
      setBanner("Google Drive disconnected.");
      void refetchDrive();
      void refetchSetup();
    } catch (err) {
      setError(formatApiError(err, "Could not disconnect Google Drive"));
    } finally {
      setDisconnectingDrive(false);
    }
  }

  return (
    <div className="space-y-6">
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
        Sign in with your workspace email and password, then connect{" "}
        <strong>your</strong> Google Workspace mailbox and calendar. Each teammate
        uses their own Google account; CRM data is shared across the team.
      </p>

      {setup && (
        <ul className="space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4">
          {setup.checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                  item.done
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-[var(--card-border)] text-body-muted"
                }`}
                aria-hidden
              >
                {item.done ? "✓" : ""}
              </span>
              <span className={item.done ? "text-body-muted" : "text-heading"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!oauthConfigured && setup && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm space-y-2">
          <p className="font-medium text-heading">Server OAuth not configured yet</p>
          <p className="text-body-muted">
            Add these to your <code className="text-xs">.env.local</code> (or VPS
            environment), restart the app, then use Connect below:
          </p>
          <div className="text-xs font-mono text-body-muted space-y-1">
            <p>GOOGLE_CLIENT_ID=your-client-id</p>
            <p>GOOGLE_CLIENT_SECRET=your-client-secret</p>
            <p className="text-body-muted/80 pt-1">
              (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET also work)
            </p>
            <p>NEXT_PUBLIC_APP_URL=http://localhost:3000</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ConnectionCard
          name="Gmail"
          description="Send quotes and contact emails from your company address. Sync threads on the contact Emails tab when read access is granted."
          status={gmailLoading ? "available" : gmailStatus}
          actionLabel={
            !oauthConfigured
              ? "Configure server OAuth first"
              : gmailConnected
                ? "Connected"
                : "Connect mailbox"
          }
          onAction={
            oauthConfigured && !gmailConnected
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
          hint={
            gmail?.email
              ? `Connected as ${gmail.email}`
              : setup?.gmail.redirect_uri
                ? `Redirect URI:\n${setup.gmail.redirect_uri}`
                : undefined
          }
        />

        <ConnectionCard
          name="Google Calendar"
          description="Sync meetings you create in ClickIn 360 to your Google Calendar."
          status={calendarLoading ? "available" : calendarStatus}
          actionLabel={
            !oauthConfigured
              ? "Configure server OAuth first"
              : calendarConnected
                ? "Connected"
                : "Connect calendar"
          }
          onAction={
            oauthConfigured && !calendarConnected
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
          hint={
            setup?.calendar.redirect_uri
              ? `Redirect URI:\n${setup.calendar.redirect_uri}`
              : undefined
          }
        />

        <ConnectionCard
          name="Google Drive"
          description="Connect the workspace business Drive for the Media library. Team members can browse and link files to contacts."
          status={driveLoading ? "available" : driveStatus}
          actionLabel={
            !oauthConfigured
              ? "Configure server OAuth first"
              : driveConnected
                ? "Connected"
                : "Connect Drive"
          }
          onAction={
            oauthConfigured && !driveConnected
              ? () => {
                  window.location.href = "/api/auth/google-drive";
                }
              : undefined
          }
          secondaryAction={
            driveConnected
              ? {
                  label: disconnectingDrive ? "Disconnecting…" : "Disconnect",
                  onClick: () => void handleDisconnectDrive(),
                  disabled: disconnectingDrive,
                }
              : undefined
          }
          hint={
            drive?.email
              ? `Workspace Drive: ${drive.email}`
              : drive?.redirect_uri
                ? `Redirect URI:\n${drive.redirect_uri}`
                : undefined
          }
        />
      </div>

      {gmailConnected && gmail?.email && (
        <p className="text-sm text-emerald-800 bg-emerald-500/10 rounded-lg px-3 py-2">
          Your mailbox: <span className="font-medium">{gmail.email}</span>
          {!gmail.read_access && (
            <>
              {" "}
              — thread sync needs read access.{" "}
              <Link href="/api/auth/google-gmail/reconnect" className="underline">
                Reconnect Gmail
              </Link>
            </>
          )}
        </p>
      )}

      <Button type="button" size="sm" variant="ghost" onClick={() => {
        void refetchSetup();
        void refetchGmail();
        void refetchCalendar();
        void refetchDrive();
      }}>
        Refresh status
      </Button>
    </div>
  );
}

function ConnectionCard({
  name,
  description,
  status,
  actionLabel,
  onAction,
  secondaryAction,
  hint,
}: {
  name: string;
  description: string;
  status: CardStatus;
  actionLabel: string;
  onAction?: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-heading">{name}</h3>
        <Badge variant={status === "connected" ? "success" : status === "not_configured" ? "neutral" : "info"}>
          {status === "connected"
            ? "Connected"
            : status === "not_configured"
              ? "Setup required"
              : "Available"}
        </Badge>
      </div>
      <p className="text-sm text-body-muted flex-1">{description}</p>
      {hint && (
        <p className="text-xs text-body-muted whitespace-pre-wrap font-mono break-all">
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {onAction ? (
          <Button
            type="button"
            size="sm"
            variant={status === "connected" ? "outline" : "default"}
            disabled={status === "not_configured"}
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

export function GoogleWorkspacePanel() {
  return (
    <Suspense fallback={<p className="text-sm text-body-muted">Loading…</p>}>
      <GoogleWorkspacePanelInner />
    </Suspense>
  );
}
