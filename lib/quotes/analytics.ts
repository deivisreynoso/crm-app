import type { SupabaseClient } from "@supabase/supabase-js";
import { QUOTE_DOCUMENT_TYPES } from "@/lib/documents/kinds";

export type QuoteAnalytics = {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  signed: number;
  pipelineValue: number;
  acceptedValue: number;
  sentValue: number;
  conversionRate: number;
  avgDaysToAccept: number | null;
  recentAccepted: {
    id: string;
    title: string;
    quote_reference: string | null;
    total_amount: number;
    accepted_at: string;
  }[];
};

export async function getQuoteAnalytics(
  supabase: SupabaseClient,
  workspaceOwnerId: string
): Promise<QuoteAnalytics> {
  const { data: rows, error } = await supabase
    .from("documents")
    .select(
      "id, title, status, total_amount, sent_at, accepted_at, rejected_at, quote_reference, created_at"
    )
    .eq("user_id", workspaceOwnerId)
    .in("type", [...QUOTE_DOCUMENT_TYPES])
    .order("accepted_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("getQuoteAnalytics:", error.message);
    return emptyAnalytics();
  }

  const docs = rows ?? [];
  const counts = { draft: 0, sent: 0, accepted: 0, rejected: 0, signed: 0 };
  let pipelineValue = 0;
  let acceptedValue = 0;
  let sentValue = 0;
  const acceptDurations: number[] = [];

  for (const d of docs) {
    const status = (d.status as string) || "draft";
    if (status in counts) counts[status as keyof typeof counts] += 1;
    const amount = Number(d.total_amount) || 0;
    if (status === "draft" || status === "sent") pipelineValue += amount;
    if (status === "accepted") acceptedValue += amount;
    if (status === "sent" || status === "accepted" || status === "rejected") {
      sentValue += amount;
    }
    if (d.accepted_at && d.sent_at) {
      const days =
        (new Date(d.accepted_at as string).getTime() -
          new Date(d.sent_at as string).getTime()) /
        (1000 * 60 * 60 * 24);
      if (days >= 0) acceptDurations.push(days);
    }
  }

  const sentCount = counts.sent + counts.accepted + counts.rejected + counts.signed;
  const conversionRate =
    sentCount > 0 ? Math.round((counts.accepted / sentCount) * 1000) / 10 : 0;

  const avgDaysToAccept =
    acceptDurations.length > 0
      ? Math.round(
          (acceptDurations.reduce((a, b) => a + b, 0) / acceptDurations.length) * 10
        ) / 10
      : null;

  const recentAccepted = docs
    .filter((d) => d.status === "accepted" && d.accepted_at)
    .slice(0, 5)
    .map((d) => ({
      id: d.id as string,
      title: d.title as string,
      quote_reference: (d.quote_reference as string | null) ?? null,
      total_amount: Number(d.total_amount) || 0,
      accepted_at: d.accepted_at as string,
    }));

  return {
    total: docs.length,
    ...counts,
    pipelineValue,
    acceptedValue,
    sentValue,
    conversionRate,
    avgDaysToAccept,
    recentAccepted,
  };
}

function emptyAnalytics(): QuoteAnalytics {
  return {
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    signed: 0,
    pipelineValue: 0,
    acceptedValue: 0,
    sentValue: 0,
    conversionRate: 0,
    avgDaysToAccept: null,
    recentAccepted: [],
  };
}
