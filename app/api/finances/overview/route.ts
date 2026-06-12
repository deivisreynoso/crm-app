import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { canViewExpenseData } from "@/lib/finances/access";
import {
  computeFinanceOverview,
  resolveOverviewDateRange,
  type OverviewPeriod,
} from "@/lib/finances/overview";
import { markOverdueInvoices } from "@/lib/finances/invoices";

export async function GET(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const params = new URL(req.url).searchParams;
    const period = (params.get("period") || "month") as OverviewPeriod;
    const from = params.get("from");
    const to = params.get("to");
    const range = resolveOverviewDateRange(period, from, to);

    const supabase = createServerSideClient();
    await markOverdueInvoices(supabase, workspaceOwnerId!);

    const includeExpenses = canViewExpenseData(role!, isWorkspaceOwner);
    const data = await computeFinanceOverview(
      supabase,
      workspaceOwnerId!,
      range,
      includeExpenses
    );

    return NextResponse.json({ data: { ...data, period, from: range.from, to: range.to } });
  } catch (err) {
    console.error("GET /api/finances/overview:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
