import type { SupabaseClient } from "@supabase/supabase-js";

export type OverviewPeriod = "month" | "quarter" | "year" | "custom";

export function resolveOverviewDateRange(
  period: OverviewPeriod,
  from?: string | null,
  to?: string | null
): { from: string; to: string } {
  const now = new Date();
  const toDate = to?.slice(0, 10) ?? now.toISOString().slice(0, 10);

  if (period === "custom" && from) {
    return { from: from.slice(0, 10), to: toDate };
  }

  const start = new Date(now);
  if (period === "quarter") {
    const qMonth = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(qMonth, 1);
  } else if (period === "year") {
    start.setMonth(0, 1);
  } else {
    start.setDate(1);
  }

  return { from: start.toISOString().slice(0, 10), to: toDate };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function computeFinanceOverview(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  range: { from: string; to: string },
  includeExpenses: boolean
) {
  const { data: incomeRows } = await supabase
    .from("finance_transactions")
    .select("amount, transaction_date, category_id, type, direction, status")
    .eq("user_id", workspaceOwnerId)
    .eq("type", "income")
    .eq("direction", "inbound")
    .eq("status", "completed")
    .gte("transaction_date", range.from)
    .lte("transaction_date", range.to);

  let expenseRows: typeof incomeRows = [];
  if (includeExpenses) {
    const { data } = await supabase
      .from("finance_transactions")
      .select("amount, transaction_date, category_id, type, direction, status")
      .eq("user_id", workspaceOwnerId)
      .eq("type", "expense")
      .eq("direction", "outbound")
      .eq("status", "completed")
      .gte("transaction_date", range.from)
      .lte("transaction_date", range.to);
    expenseRows = data ?? [];
  }

  const totalRevenue = (incomeRows ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalExpenses = includeExpenses
    ? expenseRows.reduce((s, r) => s + Number(r.amount || 0), 0)
    : null;

  const { data: outstanding } = await supabase
    .from("invoices")
    .select("total")
    .eq("user_id", workspaceOwnerId)
    .in("status", ["sent", "viewed", "overdue"]);

  const { data: pendingLinks } = await supabase
    .from("payment_links")
    .select("amount")
    .eq("user_id", workspaceOwnerId)
    .eq("status", "active");

  const { data: categories } = await supabase
    .from("finance_categories")
    .select("id, label, kind")
    .eq("user_id", workspaceOwnerId);

  const catLabel = new Map((categories ?? []).map((c) => [c.id, c.label as string]));

  const revenueByMonth: Record<string, { revenue: number; expenses: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    revenueByMonth[monthKey(d)] = { revenue: 0, expenses: 0 };
  }

  for (const row of incomeRows ?? []) {
    const key = (row.transaction_date as string).slice(0, 7);
    if (!revenueByMonth[key]) revenueByMonth[key] = { revenue: 0, expenses: 0 };
    revenueByMonth[key].revenue += Number(row.amount || 0);
  }
  if (includeExpenses) {
    for (const row of expenseRows) {
      const key = (row.transaction_date as string).slice(0, 7);
      if (!revenueByMonth[key]) revenueByMonth[key] = { revenue: 0, expenses: 0 };
      revenueByMonth[key].expenses += Number(row.amount || 0);
    }
  }

  const incomeByCat: Record<string, number> = {};
  for (const row of incomeRows ?? []) {
    const label = catLabel.get(row.category_id as string) ?? "Uncategorized";
    incomeByCat[label] = (incomeByCat[label] ?? 0) + Number(row.amount || 0);
  }

  const expensesByCat: Record<string, number> = {};
  if (includeExpenses) {
    for (const row of expenseRows) {
      const label = catLabel.get(row.category_id as string) ?? "Uncategorized";
      expensesByCat[label] = (expensesByCat[label] ?? 0) + Number(row.amount || 0);
    }
  }

  return {
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    net_profit: totalExpenses !== null ? totalRevenue - totalExpenses : null,
    outstanding_invoices_total: (outstanding ?? []).reduce(
      (s, r) => s + Number(r.total || 0),
      0
    ),
    pending_payment_links_total: (pendingLinks ?? []).reduce(
      (s, r) => s + Number(r.amount || 0),
      0
    ),
    revenue_by_month: Object.entries(revenueByMonth).map(([month, v]) => ({
      month,
      revenue: v.revenue,
      expenses: includeExpenses ? v.expenses : null,
    })),
    income_by_category: Object.entries(incomeByCat).map(([category_label, total]) => ({
      category_label,
      total,
    })),
    expenses_by_category: includeExpenses
      ? Object.entries(expensesByCat).map(([category_label, total]) => ({
          category_label,
          total,
        }))
      : null,
  };
}
