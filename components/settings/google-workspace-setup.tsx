"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useGoogleWorkspaceSetup } from "@/hooks/useGoogleWorkspace";

export function GoogleWorkspaceSetup() {
  const { data, isLoading, error, refetch } = useGoogleWorkspaceSetup();

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading Google Workspace setup…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-[var(--error)]">
        Could not load setup status. Try again from Settings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-heading">Google Workspace (Gmail)</h3>
        <p className="text-sm text-body-muted mt-1">
          Each CRM user connects their own company mailbox. Quotes and contact emails send
          from that address; replies can sync on the contact Emails tab when read access is
          granted. No server SMTP required for sales mail.
        </p>
      </div>

      <ul className="space-y-2">
        {data.checklist.map((item) => (
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

      {data.gmail.connected && data.gmail.email && (
        <p className="text-sm text-emerald-800 bg-emerald-500/10 rounded-lg px-3 py-2">
          Your mailbox: <span className="font-medium">{data.gmail.email}</span>
          {!data.gmail.read_access && (
            <>
              {" "}
              — sync needs read access.{" "}
              <Link href="/api/auth/google-gmail/reconnect" className="underline">
                Reconnect
              </Link>
            </>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {data.oauth_configured && !data.gmail.connected && (
          <a href={data.gmail.connect_path} className="inline-flex">
            <Button type="button" size="sm">
              Connect my mailbox
            </Button>
          </a>
        )}
        {data.oauth_configured && data.gmail.connected && (
          <a href={data.gmail.reconnect_path} className="inline-flex">
            <Button type="button" size="sm" variant="outline">
              Reconnect Gmail
            </Button>
          </a>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={() => void refetch()}>
          Refresh status
        </Button>
      </div>

      {!data.oauth_configured && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 text-xs font-mono text-body-muted space-y-1">
          <p>GOOGLE_CLIENT_ID=</p>
          <p>GOOGLE_CLIENT_SECRET=</p>
          <p>NEXT_PUBLIC_APP_URL=https://your-crm-domain.com</p>
          <p className="font-sans text-sm pt-2">
            Redirect URI to register:{" "}
            <span className="break-all">{data.gmail.redirect_uri}</span>
          </p>
        </div>
      )}
    </div>
  );
}
