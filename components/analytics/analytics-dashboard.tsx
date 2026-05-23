"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { usePipelineAnalytics } from "@/hooks/usePipelineAnalytics";
import { Card } from "@/components/ui/card";
import type { AnalyticsDateRange } from "@/components/analytics/analytics-date-filters";

const CHART_COLORS = ["#1b318b", "#38b6ff", "#c96dd8", "#10b981", "#f59e0b", "#6366f1"];

interface AnalyticsDashboardProps {
  pipelineId?: string;
  dateRange?: AnalyticsDateRange;
}

export function AnalyticsDashboard({
  pipelineId,
  dateRange,
}: AnalyticsDashboardProps) {
  const { data, isLoading, error } = usePipelineAnalytics(pipelineId, dateRange);

  if (isLoading) {
    return <p className="text-body-muted text-sm">Loading analytics…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-[var(--error)] text-sm">
        Could not load analytics. Ensure opportunities and pipelines exist.
      </p>
    );
  }

  const metrics = [
    { label: "Pipeline value", value: formatCurrency(data.totalValue) },
    { label: "Opportunities", value: String(data.opportunityCount) },
    {
      label: "Conversion rate",
      value: `${Math.round(data.conversionRate * 100)}%`,
    },
    {
      label: "Avg deal size",
      value: formatCurrency(data.averageDealSize),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} padding="md">
            <p className="text-xs font-semibold uppercase tracking-wide text-body-muted">
              {m.label}
            </p>
            <p className="text-2xl font-bold text-heading mt-2">{m.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-4">Value by stage</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="stageName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="value" fill="#38b6ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-4">Deals by stage</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.funnel.filter((f) => f.count > 0)}
                  dataKey="count"
                  nameKey="stageName"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => {
                    const name = String(props.name ?? "");
                    const value = props.value ?? 0;
                    return `${name}: ${value}`;
                  }}
                >
                  {data.funnel.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {data.revenueByMonth.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-4">Revenue by month</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="value" fill="#1b318b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
