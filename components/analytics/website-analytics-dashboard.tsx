"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type Ga4Data = {
  metrics: { sessions: number; users: number; pageviews: number };
  topPages: { path: string; pageviews: number }[];
  trafficSources: { source: string; sessions: number }[];
  startDate: string;
  endDate: string;
};

type Props = {
  days: "7" | "30" | "90";
};

export function WebsiteAnalyticsDashboard({ days }: Props) {
  const [data, setData] = useState<Ga4Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void axios
      .get<{ data: Ga4Data }>(`/api/analytics/ga4?days=${days}`)
      .then((res) => setData(res.data.data))
      .catch((err) => {
        const msg =
          axios.isAxiosError(err) && err.response?.data?.error
            ? String(err.response.data.error)
            : "Could not load Google Analytics.";
        setError(msg);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return <p className="text-sm text-body-muted">Loading website analytics…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900">
        {error}
        <p className="text-xs mt-2 text-body-muted">
          An admin must configure GA4_PROPERTY_ID and service account credentials under Settings →
          Integrations.
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <p className="text-xs text-body-muted">
        {data.startDate} — {data.endDate}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Sessions", value: data.metrics.sessions },
          { label: "Users", value: data.metrics.users },
          { label: "Pageviews", value: data.metrics.pageviews },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
          >
            <p className="text-xs text-body-muted">{card.label}</p>
            <p className="text-2xl font-semibold text-heading mt-1">
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--card-border)] overflow-hidden">
          <h3 className="text-sm font-semibold text-heading px-4 py-3 border-b border-[var(--card-border)]">
            Top pages
          </h3>
          <ul className="divide-y divide-[var(--card-border)] text-sm">
            {data.topPages.map((p) => (
              <li key={p.path} className="flex justify-between gap-2 px-4 py-2">
                <span className="truncate text-body-muted">{p.path || "/"}</span>
                <span className="font-medium shrink-0">{p.pageviews.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] overflow-hidden">
          <h3 className="text-sm font-semibold text-heading px-4 py-3 border-b border-[var(--card-border)]">
            Traffic sources
          </h3>
          <ul className="divide-y divide-[var(--card-border)] text-sm">
            {data.trafficSources.map((s) => (
              <li key={s.source} className="flex justify-between gap-2 px-4 py-2">
                <span className="text-body-muted">{s.source || "Direct"}</span>
                <span className="font-medium shrink-0">{s.sessions.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
