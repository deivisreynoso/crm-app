import { BetaAnalyticsDataClient } from "@google-analytics/data";

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

function rangeToDates(days: Ga4ReportRange) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Number(days));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export async function fetchGa4Dashboard(days: Ga4ReportRange = "30") {
  const propertyId = process.env.GA4_PROPERTY_ID!.trim();
  const client = getAnalyticsClient();
  const { startDate, endDate } = rangeToDates(days);

  const [summary, pages, sources] = await Promise.all([
    client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
      ],
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
  ]);

  const summaryRow = summary[0]?.rows?.[0]?.metricValues ?? [];
  const metrics = {
    sessions: Number(summaryRow[0]?.value ?? 0),
    users: Number(summaryRow[1]?.value ?? 0),
    pageviews: Number(summaryRow[2]?.value ?? 0),
  };

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

  return { startDate, endDate, metrics, topPages, trafficSources };
}
