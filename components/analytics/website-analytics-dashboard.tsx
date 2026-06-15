"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CalendarCheck,
  MousePointerClick,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  GA4_EVENT_CATEGORY_COLORS,
  GA4_EVENT_CATEGORY_LABELS,
  type Ga4EventCategory,
} from "@/lib/analytics/ga4-website-events";
import {
  ANALYTICS_CHART_COLORS,
  AnalyticsErrorCard,
  AnalyticsKpiCard,
  AnalyticsLoadingGrid,
  AnalyticsRankedBarList,
  AnalyticsSectionHeader,
  analyticsChartTooltipStyle,
} from "@/components/analytics/analytics-ui";
import type { AnalyticsDateRange } from "@/components/analytics/analytics-date-filters";

type Ga4Data = {
  startDate: string;
  endDate: string;
  metrics: {
    sessions: number;
    users: number;
    pageviews: number;
    conversions: number;
    engagementRate: number;
    sessionConversionRate: number;
    averageSessionDurationLabel: string;
  };
  dailyTrend: { date: string; sessions: number; conversions: number; eventCount: number }[];
  events: {
    eventName: string;
    label: string;
    category: Ga4EventCategory;
    description: string;
    eventCount: number;
    conversions: number;
    isKeyConversion: boolean;
    isKnown: boolean;
  }[];
  conversionEvents: {
    eventName: string;
    label: string;
    category: Ga4EventCategory;
    eventCount: number;
    conversions: number;
  }[];
  topPages: { path: string; pageviews: number }[];
  trafficSources: { source: string; sessions: number }[];
  countries: { country: string; sessions: number; users: number }[];
  catalogEventNames: string[];
};

type Props = {
  dateRange: AnalyticsDateRange;
};

function pct(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function CategoryBadge({ category }: { category: Ga4EventCategory }) {
  const color = GA4_EVENT_CATEGORY_COLORS[category];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        color,
      }}
    >
      {GA4_EVENT_CATEGORY_LABELS[category]}
    </span>
  );
}

export function WebsiteAnalyticsDashboard({ dateRange }: Props) {
  const [data, setData] = useState<Ga4Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<Ga4EventCategory | "all">("all");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    });
    void axios
      .get<{ data: Ga4Data }>(`/api/analytics/ga4?${params}`)
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
  }, [dateRange.end_date, dateRange.start_date]);

  const filteredEvents = useMemo(() => {
    if (!data) return [];
    if (eventFilter === "all") return data.events;
    return data.events.filter((e) => e.category === eventFilter);
  }, [data, eventFilter]);

  const eventsByCategory = useMemo(() => {
    if (!data) return [];
    const totals = new Map<Ga4EventCategory, number>();
    for (const e of data.events) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.eventCount);
    }
    return (Object.keys(GA4_EVENT_CATEGORY_LABELS) as Ga4EventCategory[])
      .map((cat) => ({
        category: cat,
        label: GA4_EVENT_CATEGORY_LABELS[cat],
        count: totals.get(cat) ?? 0,
        color: GA4_EVENT_CATEGORY_COLORS[cat],
      }))
      .filter((row) => row.count > 0);
  }, [data]);

  const missingCatalogEvents = useMemo(() => {
    if (!data) return [];
    const seen = new Set(data.events.map((e) => e.eventName));
    return data.catalogEventNames.filter((name) => !seen.has(name));
  }, [data]);

  if (loading) {
    return <AnalyticsLoadingGrid count={6} />;
  }

  if (error) {
    return (
      <AnalyticsErrorCard
        message={
          <>
            {error}
            <span className="block text-xs mt-2 text-body-muted font-normal">
              An admin must configure GA4_PROPERTY_ID and service account credentials under
              Settings → Integrations.
            </span>
          </>
        }
      />
    );
  }

  if (!data) return null;

  const chartTrend = data.dailyTrend.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="space-y-6">
      <AnalyticsSectionHeader
        eyebrow="Website traffic & conversions"
        subtitle={`${data.startDate} — ${data.endDate}`}
        meta="Custom events from clickin360.com · mark key events in GA4 Admin for conversion totals"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnalyticsKpiCard
          label="Sessions"
          value={data.metrics.sessions}
          icon={TrendingUp}
          accent="sky"
        />
        <AnalyticsKpiCard
          label="Users"
          value={data.metrics.users}
          icon={Users}
          accent="navy"
        />
        <AnalyticsKpiCard
          label="Pageviews"
          value={data.metrics.pageviews}
          icon={MousePointerClick}
          accent="magenta"
        />
        <AnalyticsKpiCard
          label="Conversions"
          value={data.metrics.conversions}
          hint={`${pct(data.metrics.sessionConversionRate)} session conversion rate`}
          icon={Sparkles}
          accent="success"
        />
        <AnalyticsKpiCard
          label="Engagement rate"
          value={pct(data.metrics.engagementRate)}
          hint="Engaged sessions / sessions"
          accent="sky"
        />
        <AnalyticsKpiCard
          label="Avg. session"
          value={data.metrics.averageSessionDurationLabel}
          hint="Time on site per session"
          icon={CalendarCheck}
          accent="navy"
        />
      </div>

      <Card padding="md">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold text-heading">Sessions & conversions over time</h3>
          <span className="text-xs text-body-muted flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" /> {data.startDate} — {data.endDate}
          </span>
        </div>
        <div className="h-64">
          {chartTrend.length === 0 ? (
            <p className="text-sm text-body-muted">No trend data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrend}>
                <defs>
                  <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38b6ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38b6ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={analyticsChartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#38b6ff"
                  fill="url(#sessionsFill)"
                  strokeWidth={2}
                  name="Sessions"
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stroke="#10b981"
                  fill="url(#convFill)"
                  strokeWidth={2}
                  name="Conversions"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-1">Conversion events</h3>
          <p className="text-xs text-body-muted mb-4">
            Key events marked in GA4 or with conversion counts in this period
          </p>
          {data.conversionEvents.length === 0 ? (
            <p className="text-sm text-body-muted">
              No conversion events yet. Mark <code className="text-xs">generate_lead</code>,{" "}
              <code className="text-xs">booking_completed</code>, and{" "}
              <code className="text-xs">form_submission</code> as key events in GA4 Admin.
            </p>
          ) : (
            <div className="space-y-3">
              {data.conversionEvents.map((e) => (
                <div
                  key={e.eventName}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)]/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-heading truncate">{e.label}</p>
                    <p className="text-xs text-body-muted truncate">{e.eventName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#10b981]">
                      {e.conversions.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-body-muted">
                      {e.eventCount.toLocaleString()} total fires
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-heading mb-4">Events by category</h3>
          {eventsByCategory.length === 0 ? (
            <p className="text-sm text-body-muted">No custom events recorded in this period.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventsByCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={100}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {eventsByCategory.map((row) => (
                      <Cell key={row.category} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--card-border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-heading">All website events</h3>
            <p className="text-xs text-body-muted mt-0.5">
              Full event log from GA4 (excludes automatic page_view)
            </p>
          </div>
          <select
            className="input-field text-xs py-1.5 h-8 min-w-[140px]"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as Ga4EventCategory | "all")}
          >
            <option value="all">All categories</option>
            {(Object.keys(GA4_EVENT_CATEGORY_LABELS) as Ga4EventCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {GA4_EVENT_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)]/60 text-left text-xs uppercase tracking-wide text-body-muted">
                <th className="px-6 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold text-right">Count</th>
                <th className="px-6 py-3 font-semibold text-right">Conversions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-body-muted">
                    No events in this category for the selected period.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((e) => (
                  <tr key={e.eventName} className="hover:bg-[var(--surface-subtle)]/40">
                    <td className="px-6 py-3">
                      <p className="font-medium text-heading">{e.label}</p>
                      <p className="text-xs text-body-muted">{e.eventName}</p>
                      {!e.isKnown && (
                        <p className="text-[10px] text-body-muted mt-0.5">Unmapped GA4 event</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={e.category} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-heading">
                      {e.eventCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {e.conversions > 0 ? (
                        <span className="font-semibold text-[#10b981]">
                          {e.conversions.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-body-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {missingCatalogEvents.length > 0 && (
          <div className="px-6 py-3 border-t border-[var(--card-border)] bg-[var(--surface-subtle)]/30">
            <p className="text-xs text-body-muted">
              <span className="font-medium text-heading">Not fired in this period:</span>{" "}
              {missingCatalogEvents.join(", ")}
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnalyticsRankedBarList
          title="Top pages"
          rows={data.topPages}
          labelKey="path"
          valueKey="pageviews"
          color={ANALYTICS_CHART_COLORS[0]}
        />
        <AnalyticsRankedBarList
          title="Traffic sources"
          rows={data.trafficSources.map((s) => ({
            ...s,
            source: s.source || "Direct",
          }))}
          labelKey="source"
          valueKey="sessions"
          color={ANALYTICS_CHART_COLORS[1]}
        />
        <AnalyticsRankedBarList
          title="Countries"
          subtitle="Sessions by visitor country"
          rows={data.countries ?? []}
          labelKey="country"
          valueKey="sessions"
          color={ANALYTICS_CHART_COLORS[2]}
        />
      </div>
    </div>
  );
}
