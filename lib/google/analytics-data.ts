import { BetaAnalyticsDataClient } from "@google-analytics/data";
import {
  GA4_WEBSITE_EVENT_CATALOG,
  resolveGa4EventMeta,
  type Ga4EventCategory,
} from "@/lib/analytics/ga4-website-events";

export function isGa4DataConfigured(): boolean {
  return Boolean(
    process.env.GA4_PROPERTY_ID?.trim() &&
      process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL?.trim() &&
      process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.trim()
  );
}

function getAnalyticsClient() {
  const clientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.trim()?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Google Analytics credentials are not configured.");
  }
  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
}

export type Ga4ReportRange = "7" | "30" | "90";

export type Ga4DateRange = {
  startDate: string;
  endDate: string;
};

function rangeToDates(days: Ga4ReportRange): Ga4DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Number(days));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveGa4DateRange(input: {
  start_date?: string | null;
  end_date?: string | null;
  days?: Ga4ReportRange | null;
}): Ga4DateRange {
  const start = input.start_date?.trim();
  const end = input.end_date?.trim();
  if (start && end && DATE_RE.test(start) && DATE_RE.test(end) && start <= end) {
    return { startDate: start, endDate: end };
  }
  return rangeToDates(input.days ?? "30");
}

function formatGa4Date(raw: string): string {
  if (raw.length !== 8) return raw;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export type Ga4EventRow = {
  eventName: string;
  label: string;
  category: Ga4EventCategory;
  description: string;
  eventCount: number;
  conversions: number;
  isKeyConversion: boolean;
  isKnown: boolean;
};

export type Ga4DailyTrend = {
  date: string;
  sessions: number;
  conversions: number;
  eventCount: number;
};

export type Ga4DashboardData = {
  startDate: string;
  endDate: string;
  metrics: {
    sessions: number;
    users: number;
    pageviews: number;
    conversions: number;
    engagementRate: number;
    sessionConversionRate: number;
    averageSessionDurationSeconds: number;
    averageSessionDurationLabel: string;
  };
  dailyTrend: Ga4DailyTrend[];
  events: Ga4EventRow[];
  conversionEvents: Ga4EventRow[];
  topPages: { path: string; pageviews: number }[];
  trafficSources: { source: string; sessions: number }[];
  countries: { country: string; sessions: number; users: number }[];
  catalogEventNames: string[];
};

export async function fetchGa4Dashboard(
  range: Ga4DateRange | Ga4ReportRange = "30"
): Promise<Ga4DashboardData> {
  const propertyId = process.env.GA4_PROPERTY_ID!.trim();
  const client = getAnalyticsClient();
  const { startDate, endDate } =
    typeof range === "string" ? rangeToDates(range) : range;

  const [summary, daily, eventsReport, pages, sources, countriesReport] = await Promise.all([
    client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "conversions" },
        { name: "engagementRate" },
        { name: "sessionConversionRate" },
        { name: "averageSessionDuration" },
      ],
    }),
    client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "conversions" },
        { name: "eventCount" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }, { name: "conversions" }],
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 100,
    }),
    client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 15,
    }),
  ]);

  const summaryRow = summary[0]?.rows?.[0]?.metricValues ?? [];
  const avgDurationSec = Number(summaryRow[6]?.value ?? 0);

  const metrics = {
    sessions: Number(summaryRow[0]?.value ?? 0),
    users: Number(summaryRow[1]?.value ?? 0),
    pageviews: Number(summaryRow[2]?.value ?? 0),
    conversions: Number(summaryRow[3]?.value ?? 0),
    engagementRate: Number(summaryRow[4]?.value ?? 0),
    sessionConversionRate: Number(summaryRow[5]?.value ?? 0),
    averageSessionDurationSeconds: avgDurationSec,
    averageSessionDurationLabel: formatDuration(avgDurationSec),
  };

  const dailyTrend: Ga4DailyTrend[] =
    daily[0]?.rows?.map((row) => ({
      date: formatGa4Date(row.dimensionValues?.[0]?.value ?? ""),
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      conversions: Number(row.metricValues?.[1]?.value ?? 0),
      eventCount: Number(row.metricValues?.[2]?.value ?? 0),
    })) ?? [];

  const events: Ga4EventRow[] =
    eventsReport[0]?.rows
      ?.map((row) => {
        const eventName = row.dimensionValues?.[0]?.value ?? "";
        const meta = resolveGa4EventMeta(eventName);
        const eventCount = Number(row.metricValues?.[0]?.value ?? 0);
        const conversions = Number(row.metricValues?.[1]?.value ?? 0);
        return {
          eventName,
          label: meta.label,
          category: meta.category,
          description: meta.description,
          eventCount,
          conversions,
          isKeyConversion: Boolean(meta.isKeyConversion || conversions > 0),
          isKnown: eventName in GA4_WEBSITE_EVENT_CATALOG,
        };
      })
      .filter((e) => !e.eventName.startsWith("session_") && e.eventName !== "page_view")
      .filter((e) => e.eventCount > 0) ?? [];

  const conversionEvents = events
    .filter((e) => e.conversions > 0 || e.isKeyConversion)
    .sort((a, b) => b.conversions - a.conversions || b.eventCount - a.eventCount);

  const topPages =
    pages[0]?.rows?.map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "",
      pageviews: Number(row.metricValues?.[0]?.value ?? 0),
    })) ?? [];

  const trafficSources =
    sources[0]?.rows?.map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? "",
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
    })) ?? [];

  const countries =
    countriesReport[0]?.rows?.map((row) => ({
      country: row.dimensionValues?.[0]?.value ?? "Unknown",
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
    })) ?? [];

  return {
    startDate,
    endDate,
    metrics,
    dailyTrend,
    events,
    conversionEvents,
    topPages,
    trafficSources,
    countries,
    catalogEventNames: Object.keys(GA4_WEBSITE_EVENT_CATALOG),
  };
}
