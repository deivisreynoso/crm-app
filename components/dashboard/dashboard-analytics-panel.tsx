"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { OperationsDashboard } from "@/components/analytics/operations-dashboard";
import { WebsiteAnalyticsDashboard } from "@/components/analytics/website-analytics-dashboard";
import { FinancesOverviewDashboard } from "@/components/finances/finances-overview-dashboard";
import { DashboardOverviewStats } from "@/components/dashboard/dashboard-overview-stats";
import {
  AnalyticsDateFilters,
  getDefaultAnalyticsRange,
} from "@/components/analytics/analytics-date-filters";
import { usePipelines } from "@/hooks/usePipelines";
import type { DashboardStats } from "@/lib/dashboard-stats";

type Tab = "overview" | "operations" | "pipeline" | "website" | "finances";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "operations", label: "Operations" },
  { id: "pipeline", label: "Pipeline" },
  { id: "website", label: "Website" },
  { id: "finances", label: "Finances" },
];

function parseTab(value: string | null): Tab {
  if (
    value === "operations" ||
    value === "pipeline" ||
    value === "website" ||
    value === "finances"
  ) {
    return value;
  }
  return "overview";
}

function ga4DaysFromRange(startDate: string, endDate: string): "7" | "30" | "90" {
  const days = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
  if (days <= 7) return "7";
  if (days <= 30) return "30";
  return "90";
}

export function DashboardAnalyticsPanel({ stats }: { stats: DashboardStats }) {
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

  function selectTab(next: Tab) {
    setTab(next);
    if (next === "overview") {
      router.replace("/dashboard", { scroll: false });
    } else {
      router.replace(`/dashboard?tab=${next}`, { scroll: false });
    }
  }

  return (
    <section className="space-y-5">
      <nav className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[var(--card-border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`pb-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-[var(--secondary)] text-[var(--primary)]"
                : "border-transparent text-body-muted hover:text-heading"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <DashboardOverviewStats stats={stats} />
      ) : (
        <>
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
        </>
      )}
    </section>
  );
}
