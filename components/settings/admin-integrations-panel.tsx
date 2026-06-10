"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type IntegrationStatus = {
  n8n: { configured: boolean; inbound_path: string };
  whatsapp: { configured: boolean; inbound_path: string };
  stripe: { configured: boolean };
  mailgun: { configured: boolean };
  google_analytics: { configured: boolean; measurement_id: string | null };
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
    { label: "WhatsApp", ok: data.whatsapp.configured, detail: data.whatsapp.inbound_path },
    { label: "Stripe", ok: data.stripe.configured, detail: "Webhook: /api/webhooks/stripe" },
    { label: "Mailgun", ok: data.mailgun.configured, detail: "Transactional email" },
    {
      label: "Google Analytics",
      ok: data.google_analytics.configured,
      detail: data.google_analytics.measurement_id ?? "Not set",
    },
  ];

  return (
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
  );
}
