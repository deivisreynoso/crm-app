"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-shell";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { OperationsDashboard } from "@/components/analytics/operations-dashboard";
import {
  AnalyticsDateFilters,
  getDefaultAnalyticsRange,
} from "@/components/analytics/analytics-date-filters";
import { usePipelines } from "@/hooks/usePipelines";

type Tab = "operations" | "pipeline";

export default function AnalyticsPage() {
  const { data: pipelines = [] } = usePipelines();
  const [tab, setTab] = useState<Tab>("operations");
  const [pipelineId, setPipelineId] = useState("");
  const [dateRange, setDateRange] = useState(getDefaultAnalyticsRange);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Analytics"
        description="Pipeline revenue, service tickets, appointments, and lead metrics"
      />

      <nav className="flex gap-4 border-b border-[var(--card-border)]">
        {(
          [
            { id: "operations" as const, label: "Operations" },
            { id: "pipeline" as const, label: "Pipeline" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-[var(--secondary)] text-[var(--primary)]"
                : "border-transparent text-body-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <AnalyticsDateFilters value={dateRange} onChange={setDateRange} />

      {tab === "operations" ? (
        <OperationsDashboard dateRange={dateRange} />
      ) : (
        <>
          {pipelines.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-body-muted">Pipeline</label>
              <select
                className="input-field min-w-[200px]"
                value={pipelineId}
                onChange={(e) => setPipelineId(e.target.value)}
              >
                <option value="">All / default</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <AnalyticsDashboard
            pipelineId={pipelineId || undefined}
            dateRange={dateRange}
          />
        </>
      )}
    </div>
  );
}
