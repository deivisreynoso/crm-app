"use client";

import type { AnalyticsDateRange } from "@/components/analytics/analytics-date-filters";
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
import { DollarSign, Link2, Receipt, TrendingUp } from "lucide-react";
import {
  ANALYTICS_CHART_COLORS,
  AnalyticsKpiCard,
  AnalyticsLoadingGrid,
  AnalyticsSectionHeader,
  analyticsChartTooltipStyle,
} from "@/components/analytics/analytics-ui";
import { useFinanceOverview } from "@/hooks/useFinances";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { formatCurrency } from "@/lib/utils";

export function FinancesOverviewDashboard({
  dateRange,
}: {
  dateRange: AnalyticsDateRange;
}) {
  const { canManage } = useWorkspaceCapabilities();
  const { data, isLoading, error } = useFinanceOverview(
    "custom",
    dateRange.start_date,
    dateRange.end_date
  );

  if (isLoading) return <AnalyticsLoadingGrid count={4} />;
  if (error || !data) {
    return <p className="text-sm text-[var(--error)]">Could not load overview.</p>;
  }

  const currency = "USD";

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Total Revenue"
          value={formatCurrency(data.total_revenue, currency)}
          accent="success"
          icon={TrendingUp}
        />
        {canManage && data.total_expenses !== null && (
          <AnalyticsKpiCard
            label="Total Expenses"
            value={formatCurrency(data.total_expenses, currency)}
            accent="warning"
            icon={Receipt}
          />
        )}
        {canManage && data.net_profit !== null && (
          <AnalyticsKpiCard
            label="Net Profit"
            value={formatCurrency(data.net_profit, currency)}
            accent="navy"
            icon={DollarSign}
          />
        )}
        <AnalyticsKpiCard
          label="Outstanding Invoices"
          value={formatCurrency(data.outstanding_invoices_total, currency)}
          accent="sky"
          icon={Receipt}
        />
        <AnalyticsKpiCard
          label="Pending Payment Links"
          value={formatCurrency(data.pending_payment_links_total, currency)}
          accent="magenta"
          icon={Link2}
        />
      </div>

      <section className="space-y-4">
        <AnalyticsSectionHeader eyebrow="Trends" title="Revenue vs expenses (12 months)" />
        <div className="h-72 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.revenue_by_month}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={analyticsChartTooltipStyle} />
              <Bar dataKey="revenue" name="Revenue" fill={ANALYTICS_CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
              {canManage && (
                <Bar dataKey="expenses" name="Expenses" fill={ANALYTICS_CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <AnalyticsSectionHeader eyebrow="Breakdown" title="Income by category" />
          <div className="h-64 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.income_by_category}
                  dataKey="total"
                  nameKey="category_label"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) =>
                    String((entry as { category_label?: string }).category_label ?? "")
                  }
                >
                  {data.income_by_category.map((_, i) => (
                    <Cell key={i} fill={ANALYTICS_CHART_COLORS[i % ANALYTICS_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={analyticsChartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {canManage && data.expenses_by_category && (
          <section className="space-y-4">
            <AnalyticsSectionHeader eyebrow="Breakdown" title="Expenses by category" />
            <div className="h-64 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expenses_by_category}
                    dataKey="total"
                    nameKey="category_label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) =>
                    String((entry as { category_label?: string }).category_label ?? "")
                  }
                  >
                    {data.expenses_by_category.map((_, i) => (
                      <Cell key={i} fill={ANALYTICS_CHART_COLORS[i % ANALYTICS_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={analyticsChartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
