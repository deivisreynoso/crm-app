"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type IntegrationStatus = {
  n8n: { configured: boolean; inbound_path: string };
  stripe: {
    configured: boolean;
    webhook_path?: string;
    webhook_secret_set?: boolean;
  };
  mailgun: { configured: boolean };
  google_analytics: {
    configured: boolean;
    property_id: string | null;
    service_account_set?: boolean;
  };
};

export function AdminIntegrationsPanel() {
  const [data, setData] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    void axios
      .get<{ data: IntegrationStatus }>("/api/settings/integrations")
      .then((res) => setData(res.data.data))
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return <p className="text-sm text-body-muted">Loading integration status…</p>;
  }

  const rows = [
    { label: "N8N", ok: data.n8n.configured, detail: data.n8n.inbound_path },
    {
      label: "Stripe",
      ok: data.stripe.configured,
      detail: data.stripe.configured
        ? `${data.stripe.webhook_path ?? "/api/webhooks/stripe"} · webhook secret ${
            data.stripe.webhook_secret_set ? "set" : "missing"
          }`
        : "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in server env",
    },
    { label: "Mailgun", ok: data.mailgun.configured, detail: "Transactional email" },
    {
      label: "Google Analytics (GA4 Data API)",
      ok: data.google_analytics.configured,
      detail: data.google_analytics.configured
        ? `Property ${data.google_analytics.property_id ?? "configured"}`
        : "Set GA4_PROPERTY_ID, GOOGLE_ANALYTICS_CLIENT_EMAIL, GOOGLE_ANALYTICS_PRIVATE_KEY",
    },
  ];

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-[var(--card-border)] rounded-xl border border-[var(--card-border)]">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 p-4 text-sm">
            <div>
              <p className="font-medium text-heading">{row.label}</p>
              <p className="text-xs text-body-muted mt-0.5">{row.detail}</p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                row.ok
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-amber-500/10 text-amber-800"
              }`}
            >
              {row.ok ? "Configured" : "Needs setup"}
            </span>
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-[var(--card-border)] p-4 text-xs text-body-muted space-y-3">
        <p className="font-medium text-heading text-sm">Stripe setup</p>
        <p>
          Add <code className="text-[11px]">STRIPE_SECRET_KEY</code> and{" "}
          <code className="text-[11px]">STRIPE_WEBHOOK_SECRET</code> to server environment
          variables. Point your Stripe webhook to{" "}
          <code className="text-[11px]">{data.stripe.webhook_path ?? "/api/webhooks/stripe"}</code>{" "}
          and subscribe to <code className="text-[11px]">checkout.session.completed</code>,{" "}
          <code className="text-[11px]">payment_intent.succeeded</code>, and{" "}
          <code className="text-[11px]">invoice.paid</code>.
        </p>
        <p className="font-medium text-heading text-sm pt-1">Google Analytics setup</p>
        <p>
          Create a Google Cloud service account with Analytics Data API access, grant it Viewer on
          your GA4 property, then set <code className="text-[11px]">GA4_PROPERTY_ID</code> (e.g.{" "}
          <code className="text-[11px]">properties/123456789</code>),{" "}
          <code className="text-[11px]">GOOGLE_ANALYTICS_CLIENT_EMAIL</code>, and{" "}
          <code className="text-[11px]">GOOGLE_ANALYTICS_PRIVATE_KEY</code>.
        </p>
      </div>
    </div>
  );
}
