"use client";

import {
  Area,
  AreaChart,
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
import {
  DollarSign,
  Layers,
  Percent,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { usePipelineAnalytics } from "@/hooks/usePipelineAnalytics";
import { Card } from "@/components/ui/card";
import type { AnalyticsDateRange } from "@/components/analytics/analytics-date-filters";
import {
  ANALYTICS_CHART_COLORS,
  AnalyticsErrorCard,
  AnalyticsKpiCard,
  AnalyticsLoadingGrid,
  AnalyticsSectionHeader,
  analyticsChartTooltipStyle,
} from "@/components/analytics/analytics-ui";

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
    return <AnalyticsLoadingGrid count={6} />;
  }

  if (error || !data) {
    return (
      <AnalyticsErrorCard message="Could not load pipeline analytics. Ensure opportunities and pipelines exist." />
    );
  }

  const rangeLabel = dateRange
    ? `${dateRange.start_date} — ${dateRange.end_date}`
    : undefined;

  const funnelData = data.funnel.filter((f) => f.count > 0);

  return (
    <div className="space-y-6">
      <AnalyticsSectionHeader
        eyebrow="Pipeline performance"
        subtitle={rangeLabel}
        meta="Revenue, stage mix, and deal velocity"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <AnalyticsKpiCard
          label="Pipeline value"
          value={formatCurrency(data.totalValue)}
          icon={DollarSign}
          accent="navy"
        />
        <AnalyticsKpiCard
          label="Opportunities"
          value={data.opportunityCount}
          icon={Layers}
          accent="sky"
          hint={`${data.openCount} open · ${data.wonCount} won · ${data.lostCount} lost`}
        />
        <AnalyticsKpiCard
          label="Conversion rate"
          value={`${Math.round(data.conversionRate * 100)}%`}
          icon={Percent}
          accent="success"
          hint="Won / total opportunities"
        />
        <AnalyticsKpiCard
          label="Avg deal size"
          value={formatCurrency(data.averageDealSize)}
          icon={Target}
          accent="magenta"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AnalyticsKpiCard
          label="Open deals"
          value={data.openCount}
          icon={TrendingUp}
          accent="sky"
        />
        <AnalyticsKpiCard
          label="Won"
          value={data.wonCount}
          icon={TrendingUp}
          accent="success"
        />
        <AnalyticsKpiCard
          label="Lost"
          value={data.lostCount}
          icon={TrendingDown}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-1">Value by stage</h3>
          <p className="text-xs text-body-muted mb-4">Total pipeline value per stage</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="stageName" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={56} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={analyticsChartTooltipStyle}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.byStage.map((_, i) => (
                    <Cell
                      key={i}
                      fill={ANALYTICS_CHART_COLORS[i % ANALYTICS_CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-1">Deals by stage</h3>
          <p className="text-xs text-body-muted mb-4">Opportunity count per stage</p>
          <div className="h-64">
            {funnelData.length === 0 ? (
              <p className="text-sm text-body-muted">No opportunities in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={funnelData}
                    dataKey="count"
                    nameKey="stageName"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={88}
                    paddingAngle={2}
                    label={(props) => {
                      const name = String(props.name ?? "");
                      const value = props.value ?? 0;
                      return `${name}: ${value}`;
                    }}
                  >
                    {funnelData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={ANALYTICS_CHART_COLORS[i % ANALYTICS_CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={analyticsChartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {data.revenueByMonth.length > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-1">Revenue by month</h3>
          <p className="text-xs text-body-muted mb-4">Won deal value over time</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueByMonth}>
                <defs>
                  <linearGradient id="pipelineRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1b318b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1b318b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={analyticsChartTooltipStyle}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#1b318b"
                  fill="url(#pipelineRevenueFill)"
                  strokeWidth={2}
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
