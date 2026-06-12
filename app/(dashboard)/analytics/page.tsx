"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { PageHeader } from "@/components/ui/page-shell";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { OperationsDashboard } from "@/components/analytics/operations-dashboard";
import { WebsiteAnalyticsDashboard } from "@/components/analytics/website-analytics-dashboard";
import { FinancesOverviewDashboard } from "@/components/finances/finances-overview-dashboard";
import {
  AnalyticsDateFilters,
  getDefaultAnalyticsRange,
} from "@/components/analytics/analytics-date-filters";
import { usePipelines } from "@/hooks/usePipelines";

type Tab = "operations" | "pipeline" | "website" | "finances";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "operations", label: "Operations" },
  { id: "pipeline", label: "Pipeline" },
  { id: "website", label: "Website" },
  { id: "finances", label: "Finances" },
];

function parseTab(value: string | null): Tab {
  if (value === "pipeline" || value === "website" || value === "finances") return value;
  return "operations";
}

function ga4DaysFromRange(startDate: string, endDate: string): "7" | "30" | "90" {
  const days = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
  if (days <= 7) return "7";
  if (days <= 30) return "30";
  return "90";
}

function AnalyticsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: pipelines = [] } = usePipelines();
  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get("tab")));
  const [pipelineId, setPipelineId] = useState("");
  const [dateRange, setDateRange] = useState(getDefaultAnalyticsRange);

  const ga4Days = useMemo(
    () => ga4DaysFromRange(dateRange.start_date, dateRange.end_date),
    [dateRange.end_date, dateRange.start_date]
  );

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Analytics"
        description="Operations, pipeline, website traffic, and financial performance in one place"
      />

      <nav className="flex flex-wrap gap-4 border-b border-[var(--card-border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              router.replace(`/analytics?tab=${t.id}`, { scroll: false });
            }}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-[var(--secondary)] text-[var(--primary)]"
                : "border-transparent text-body-muted hover:text-heading"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab !== "finances" && tab !== "website" && (
        <AnalyticsDateFilters value={dateRange} onChange={setDateRange} />
      )}

      {tab === "finances" ? (
        <FinancesOverviewDashboard />
      ) : tab === "operations" ? (
        <OperationsDashboard dateRange={dateRange} />
      ) : tab === "website" ? (
        <WebsiteAnalyticsDashboard days={ga4Days} />
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

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-body-muted">Loading analytics…</p>}>
      <AnalyticsPageInner />
    </Suspense>
  );
}
