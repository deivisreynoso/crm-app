"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const ANALYTICS_CHART_COLORS = [
  "#1b318b",
  "#38b6ff",
  "#c96dd8",
  "#10b981",
  "#f59e0b",
  "#6366f1",
];

export type AnalyticsAccent = "navy" | "sky" | "magenta" | "success" | "warning";

const ACCENT_CLASSES: Record<AnalyticsAccent, string> = {
  navy: "from-[#1b318b]/12 to-transparent border-[#1b318b]/20",
  sky: "from-[#38b6ff]/12 to-transparent border-[#38b6ff]/25",
  magenta: "from-[#c96dd8]/12 to-transparent border-[#c96dd8]/25",
  success: "from-[#10b981]/12 to-transparent border-[#10b981]/25",
  warning: "from-[#f59e0b]/12 to-transparent border-[#f59e0b]/25",
};

export const analyticsChartTooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--card-border)",
  borderRadius: 8,
  fontSize: 12,
};

export function AnalyticsSectionHeader({
  eyebrow,
  title,
  subtitle,
  meta,
}: {
  eyebrow: string;
  title?: string;
  subtitle?: string;
  meta?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--secondary)]">
          {eyebrow}
        </p>
        {title && <p className="text-sm font-medium text-heading mt-0.5">{title}</p>}
        {subtitle && <p className="text-sm text-body-muted mt-1">{subtitle}</p>}
      </div>
      {meta && <p className="text-xs text-body-muted">{meta}</p>}
    </div>
  );
}

export function AnalyticsKpiCard({
  label,
  value,
  hint,
  accent = "navy",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: AnalyticsAccent;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const display =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card
      padding="md"
      className={cn(
        "relative overflow-hidden border bg-gradient-to-br",
        ACCENT_CLASSES[accent]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-body-muted">
            {label}
          </p>
          <p className="text-2xl font-bold text-heading mt-2">{display}</p>
          {hint && <p className="text-xs text-body-muted mt-1">{hint}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-[var(--surface-subtle)] p-2 text-[var(--primary)]">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function AnalyticsLoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-[var(--surface-subtle)]" />
      ))}
    </div>
  );
}

export function AnalyticsErrorCard({ message }: { message: React.ReactNode }) {
  return (
    <Card padding="md" className="border-[var(--error)]/30 bg-[var(--error)]/5">
      <div className="text-sm text-[var(--error)]">{message}</div>
    </Card>
  );
}

export function AnalyticsRankedBarList({
  title,
  subtitle,
  rows,
  valueKey,
  labelKey,
  color = ANALYTICS_CHART_COLORS[1],
}: {
  title: string;
  subtitle?: string;
  rows: Record<string, string | number>[];
  valueKey: string;
  labelKey: string;
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1);

  return (
    <Card padding="md" className="h-full">
      <h3 className="text-sm font-semibold text-heading">{title}</h3>
      {subtitle && <p className="text-xs text-body-muted mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {rows.length === 0 ? (
        <p className="text-sm text-body-muted">No data for this period.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, i) => {
            const label = String(row[labelKey] || "—");
            const value = Number(row[valueKey]) || 0;
            const width = Math.max(4, (value / max) * 100);
            return (
              <li key={`${label}-${i}`}>
                <div className="flex items-center justify-between gap-2 text-sm mb-1">
                  <span className="truncate text-body-muted" title={label}>
                    {label}
                  </span>
                  <span className="font-semibold text-heading shrink-0">
                    {value.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${width}%`, background: color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function AnalyticsHorizontalBarChart({
  title,
  subtitle,
  data,
  labelKey,
  valueKey,
  emptyMessage = "No data for this period.",
  formatValue,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  labelKey: string;
  valueKey: string;
  emptyMessage?: string;
  formatValue?: (v: number) => string;
}) {
  const chartData = data.map((row) => ({
    ...row,
    label: String(row[labelKey] ?? "").replace(/_/g, " "),
    value: Number(row[valueKey]) || 0,
  }));

  return (
    <Card padding="md" className="h-full">
      <h3 className="text-sm font-semibold text-heading">{title}</h3>
      {subtitle && <p className="text-xs text-body-muted mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {chartData.length === 0 ? (
        <p className="text-sm text-body-muted">{emptyMessage}</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={88}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={analyticsChartTooltipStyle}
                formatter={(v) =>
                  formatValue ? formatValue(Number(v)) : Number(v).toLocaleString()
                }
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={ANALYTICS_CHART_COLORS[i % ANALYTICS_CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
