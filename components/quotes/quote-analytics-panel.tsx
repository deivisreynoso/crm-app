"use client";

import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { useQuoteAnalytics } from "@/hooks/useQuoteAnalytics";
import { formatCurrency } from "@/lib/utils";
import { formatQuoteDate } from "@/lib/crm/format-date";

export function QuoteAnalyticsPanel() {
  const { dict, locale } = useCrmLocale();
  const q = dict.quotes;
  const { data, isLoading } = useQuoteAnalytics();

  if (isLoading) {
    return (
      <p className="text-sm text-body-muted py-4">{q?.analyticsLoading ?? "Loading analytics…"}</p>
    );
  }

  if (!data) return null;

  const cards = [
    {
      label: q?.analyticsTotal ?? "Total quotes",
      value: String(data.total),
      sub: null,
    },
    {
      label: q?.analyticsPipeline ?? "Open pipeline",
      value: formatCurrency(data.pipelineValue),
      sub: `${data.draft + data.sent} ${q?.analyticsOpen ?? "open"}`,
    },
    {
      label: q?.analyticsAccepted ?? "Accepted",
      value: String(data.accepted),
      sub: formatCurrency(data.acceptedValue),
    },
    {
      label: q?.analyticsConversion ?? "Win rate",
      value: `${data.conversionRate}%`,
      sub:
        data.avgDaysToAccept != null
          ? `${q?.analyticsAvgDays ?? "Avg."} ${data.avgDaysToAccept} ${q?.analyticsDays ?? "days"}`
          : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="surface-card p-4 border border-[var(--card-border)]"
          >
            <p className="text-xs font-medium text-body-muted uppercase tracking-wide">
              {c.label}
            </p>
            <p className="text-xl font-semibold text-heading mt-1">{c.value}</p>
            {c.sub && <p className="text-xs text-body-muted mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
          {q?.statusDraft ?? "Draft"}: {data.draft}
        </span>
        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">
          {q?.statusSent ?? "Sent"}: {data.sent}
        </span>
        <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">
          {q?.statusAccepted ?? "Accepted"}: {data.accepted}
        </span>
        <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">
          {q?.statusRejected ?? "Declined"}: {data.rejected}
        </span>
      </div>

      {data.recentAccepted.length > 0 && (
        <div className="surface-card p-4 border border-[var(--card-border)]">
          <h3 className="text-sm font-semibold text-heading mb-3">
            {q?.analyticsRecentAccepted ?? "Recently accepted"}
          </h3>
          <ul className="space-y-2 text-sm">
            {data.recentAccepted.map((row) => (
              <li
                key={row.id}
                className="flex justify-between gap-2 border-b border-[var(--card-border)] pb-2 last:border-0 last:pb-0"
              >
                <span className="font-medium text-heading truncate">
                  {row.quote_reference ? `${row.quote_reference} — ` : ""}
                  {row.title}
                </span>
                <span className="text-body-muted shrink-0 text-right">
                  {formatCurrency(row.total_amount)}
                  <br />
                  <span className="text-xs">
                    {formatQuoteDate(row.accepted_at, locale)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
