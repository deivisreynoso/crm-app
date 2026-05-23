"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { formatApiError } from "@/lib/validation-errors";

type IntegrationStatus = "connected" | "available" | "coming_soon" | "not_configured";

type IntegrationCard = {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  actionLabel: string;
  onAction?: () => void;
  secondaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  docsHint?: string;
  loading?: boolean;
};

export function IntegrationsHub() {
  const searchParams = useSearchParams();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarConfigured, setCalendarConfigured] = useState(true);
  const [calendarRedirectUri, setCalendarRedirectUri] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);

  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailConfigured, setGmailConfigured] = useState(true);
  const [gmailRedirectUri, setGmailRedirectUri] = useState<string | null>(null);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailReadAccess, setGmailReadAccess] = useState(true);
  const [gmailLoading, setGmailLoading] = useState(true);

  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);
  const [disconnectingGmail, setDisconnectingGmail] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCalendarStatus = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const { data } = await axios.get<{
        connected: boolean;
        configured: boolean;
        redirect_uri?: string;
      }>("/api/integrations/google-calendar/status");
      setCalendarConnected(data.connected);
      setCalendarConfigured(data.configured);
      setCalendarRedirectUri(data.redirect_uri ?? null);
    } catch {
      setCalendarConnected(false);
      setCalendarConfigured(false);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const loadGmailStatus = useCallback(async () => {
    setGmailLoading(true);
    try {
      const { data } = await axios.get<{
        connected: boolean;
        configured: boolean;
        redirect_uri?: string;
        email?: string | null;
        read_access?: boolean;
        storage_error?: string;
      }>("/api/integrations/gmail/status");
      setGmailConnected(data.connected);
      setGmailConfigured(data.configured);
      setGmailRedirectUri(data.redirect_uri ?? null);
      setGmailEmail(data.email ?? null);
      setGmailReadAccess(data.read_access ?? false);
      if (data.storage_error) {
        setError(data.storage_error);
      }
    } catch {
      setGmailConnected(false);
      setGmailConfigured(false);
    } finally {
      setGmailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendarStatus();
    void loadGmailStatus();
  }, [loadCalendarStatus, loadGmailStatus]);

  useEffect(() => {
    const calendarParam = searchParams.get("google_calendar");
    if (calendarParam === "connected") {
      setBanner(
        "Google Calendar connected. New meetings will sync to your Google calendar."
      );
      void loadCalendarStatus();
    } else if (calendarParam === "error") {
      setError(
        "Google Calendar connection failed. Check your OAuth settings and try again."
      );
    }

    const gmailParam = searchParams.get("google_gmail");
    if (gmailParam === "connected") {
      setBanner(
        "Gmail connected. You can send and sync email from contact records."
      );
      void loadGmailStatus();
    } else if (gmailParam === "connected_no_read") {
      setError(
        "Gmail connected for sending only. Click Reconnect on the Gmail card and approve all permissions to sync conversations."
      );
      void loadGmailStatus();
    } else if (gmailParam === "error") {
      const reason = searchParams.get("reason");
      if (reason === "migration") {
        setError(
          "Gmail authorized with Google but could not save credentials. Run migration 018_google_gmail_tokens.sql in Supabase, then click Connect again."
        );
      } else {
        setError(
          "Gmail connection failed. Check redirect URI, Gmail API enabled, and OAuth settings, then try again."
        );
      }
    }
  }, [searchParams, loadCalendarStatus, loadGmailStatus]);

  async function handleDisconnectCalendar() {
    setError(null);
    setDisconnectingCalendar(true);
    try {
      await axios.delete("/api/integrations/google-calendar/disconnect");
      setCalendarConnected(false);
      setBanner("Google Calendar disconnected.");
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
      setGmailConnected(false);
      setGmailEmail(null);
      setBanner("Gmail disconnected.");
    } catch (err) {
      setError(formatApiError(err, "Could not disconnect"));
    } finally {
      setDisconnectingGmail(false);
    }
  }

  const calendarStatus: IntegrationStatus = !calendarConfigured
    ? "not_configured"
    : calendarConnected
      ? "connected"
      : "available";

  const gmailStatus: IntegrationStatus = !gmailConfigured
    ? "not_configured"
    : gmailConnected
      ? "connected"
      : "available";

  const cards: IntegrationCard[] = [
    {
      id: "google_calendar",
      name: "Google Calendar",
      description:
        "Sync meetings created in ClickIn 360 to your Google Calendar. Connect once, then use the Calendar page to schedule with contacts.",
      status: calendarLoading ? "available" : calendarStatus,
      loading: calendarLoading,
      actionLabel: !calendarConfigured
        ? "Not configured"
        : calendarConnected
          ? "Connected"
          : "Connect",
      onAction:
        calendarConfigured && !calendarConnected
          ? () => {
              window.location.href = "/api/auth/google-calendar";
            }
          : undefined,
      secondaryAction:
        calendarConnected && calendarConfigured
          ? {
              label: disconnectingCalendar ? "Disconnecting…" : "Disconnect",
              onClick: () => void handleDisconnectCalendar(),
              disabled: disconnectingCalendar,
            }
          : undefined,
      docsHint: calendarRedirectUri
        ? `Calendar redirect URI (Google Cloud → Authorized redirect URIs):\n${calendarRedirectUri}`
        : undefined,
    },
    {
      id: "gmail",
      name: "Gmail",
      description:
        "Send email to contacts and sync threads into the Emails tab on each contact. Disconnect and reconnect after updates to grant read access for sync.",
      status: gmailLoading ? "available" : gmailStatus,
      loading: gmailLoading,
      actionLabel: !gmailConfigured
        ? "Not configured"
        : gmailConnected
          ? "Connected"
          : "Connect",
      onAction:
        gmailConfigured && !gmailConnected
          ? () => {
              window.location.href = "/api/auth/google-gmail";
            }
          : undefined,
      secondaryAction:
        gmailConnected && gmailConfigured && !gmailReadAccess
          ? {
              label: "Reconnect for sync",
              onClick: () => {
                window.location.href = "/api/auth/google-gmail/reconnect";
              },
            }
          : gmailConnected && gmailConfigured
            ? {
                label: disconnectingGmail ? "Disconnecting…" : "Disconnect",
                onClick: () => void handleDisconnectGmail(),
                disabled: disconnectingGmail,
              }
            : undefined,
      docsHint: gmailRedirectUri
        ? `Gmail redirect URI (add alongside Calendar URI in Google Cloud):\n${gmailRedirectUri}${
            gmailEmail ? `\n\nConnected as: ${gmailEmail}` : ""
          }`
        : undefined,
    },
    {
      id: "n8n",
      name: "n8n Automation",
      description:
        "Trigger workflows when contacts, opportunities, tickets, or documents change. Set N8N_WEBHOOK_URL in your server environment.",
      status:
        process.env.NEXT_PUBLIC_N8N_CONFIGURED === "true" ? "connected" : "available",
      actionLabel: "Configure in .env",
      docsHint:
        "Events: contact.created, opportunity.updated, document.sent, email.sent, and more.",
    },
    {
      id: "google_drive",
      name: "Google Drive",
      description:
        "Store documents and attachments in Drive instead of the default file bucket. Will replace Supabase storage for uploads.",
      status: "coming_soon",
      actionLabel: "Coming soon",
      docsHint: "Planned replacement for crm_documents storage.",
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      description:
        "Message contacts and log conversations in the CRM. Business API connection will be added in a future release.",
      status: "coming_soon",
      actionLabel: "Coming soon",
    },
    {
      id: "stripe",
      name: "Stripe Payments",
      description:
        "Record payments from checkout and invoices. Webhook setup will be available when you enable billing.",
      status: "coming_soon",
      actionLabel: "Coming soon",
    },
  ];

  function statusBadge(status: IntegrationStatus) {
    if (status === "connected") return "Connected";
    if (status === "coming_soon") return "Coming soon";
    if (status === "not_configured") return "Setup required";
    return "Available";
  }

  function statusVariant(status: IntegrationStatus) {
    if (status === "connected") return "success" as const;
    if (status === "coming_soon" || status === "not_configured") return "neutral" as const;
    return "info" as const;
  }

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
        Connect tools your team uses. Google Calendar and Gmail are ready; Drive and
        WhatsApp will be added when you are ready.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-heading">{card.name}</h3>
              <Badge variant={statusVariant(card.status)}>
                {statusBadge(card.status)}
              </Badge>
            </div>
            <p className="text-sm text-body-muted flex-1">{card.description}</p>
            {card.docsHint && (
              <p className="text-xs text-body-muted whitespace-pre-wrap font-mono break-all">
                {card.docsHint}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={card.status === "connected" ? "outline" : "default"}
                disabled={
                  card.status === "coming_soon" ||
                  card.status === "not_configured" ||
                  card.loading ||
                  (!card.onAction && card.status !== "connected")
                }
                onClick={card.onAction}
              >
                {card.actionLabel}
              </Button>
              {card.secondaryAction && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={card.secondaryAction.disabled}
                  onClick={card.secondaryAction.onClick}
                >
                  {card.secondaryAction.label}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
