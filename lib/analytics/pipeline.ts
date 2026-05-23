import { createServerSideClient } from "@/lib/supabase";

export interface PipelineAnalytics {
  totalValue: number;
  opportunityCount: number;
  wonCount: number;
  lostCount: number;
  openCount: number;
  conversionRate: number;
  averageDealSize: number;
  byStage: Array<{ stageId: string; stageName: string; count: number; value: number }>;
  funnel: Array<{ stageName: string; count: number }>;
  revenueByMonth: Array<{ month: string; value: number }>;
}

function isWonStage(name: string) {
  return /won|closed.?won/i.test(name);
}

function isLostStage(name: string) {
  return /lost|closed.?lost/i.test(name);
}

export async function getPipelineAnalytics(
  userId: string,
  pipelineId?: string,
  range?: { startDate?: string; endDate?: string }
): Promise<PipelineAnalytics> {
  const supabase = createServerSideClient();

  let pipelineQuery = supabase
    .from("pipelines")
    .select("id, name, stages")
    .eq("user_id", userId);

  if (pipelineId) {
    pipelineQuery = pipelineQuery.eq("id", pipelineId);
  }

  const { data: pipelines } = await pipelineQuery;
  const pipeline = pipelineId
    ? pipelines?.[0]
    : pipelines?.[0];

  const stages = (pipeline?.stages as Array<{ id: string; name: string }>) ?? [];

  let oppQuery = supabase
    .from("opportunities")
    .select("id, stage, value, currency, created_at, updated_at")
    .eq("user_id", userId);

  if (pipelineId) {
    oppQuery = oppQuery.eq("pipeline_id", pipelineId);
  }

  const { data: opportunities } = await oppQuery;
  const allOpps = opportunities ?? [];

  const stageMap = new Map(stages.map((s) => [s.id, s.name]));
  const byStageMap = new Map<string, { count: number; value: number }>();

  for (const stage of stages) {
    byStageMap.set(stage.id, { count: 0, value: 0 });
  }

  let totalValue = 0;
  let wonCount = 0;
  let lostCount = 0;

  const monthMap = new Map<string, number>();

  const inRange = (iso: string) => {
    if (!range?.startDate && !range?.endDate) return true;
    const t = new Date(iso).getTime();
    if (range.startDate) {
      const start = new Date(`${range.startDate}T00:00:00.000Z`).getTime();
      if (t < start) return false;
    }
    if (range.endDate) {
      const end = new Date(`${range.endDate}T23:59:59.999Z`).getTime();
      if (t > end) return false;
    }
    return true;
  };

  const opps = allOpps.filter((o) => inRange(o.updated_at as string));

  for (const opp of opps) {

    const val = Number(opp.value) || 0;
    totalValue += val;

    const stageName = stageMap.get(opp.stage) ?? opp.stage;
    const bucket = byStageMap.get(opp.stage) ?? { count: 0, value: 0 };
    bucket.count += 1;
    bucket.value += val;
    byStageMap.set(opp.stage, bucket);

    if (isWonStage(stageName)) wonCount += 1;
    if (isLostStage(stageName)) lostCount += 1;

    const month = (opp.updated_at as string).slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + val);
  }

  const byStage = stages.map((s) => {
    const b = byStageMap.get(s.id) ?? { count: 0, value: 0 };
    return {
      stageId: s.id,
      stageName: s.name,
      count: b.count,
      value: b.value,
    };
  });

  const funnel = byStage.map((s) => ({
    stageName: s.stageName,
    count: s.count,
  }));

  const revenueByMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }));

  const closed = wonCount + lostCount;
  const conversionRate = closed > 0 ? wonCount / closed : 0;
  const averageDealSize = opps.length > 0 ? totalValue / opps.length : 0;

  return {
    totalValue,
    opportunityCount: opps.length,
    wonCount,
    lostCount,
    openCount: opps.length - wonCount - lostCount,
    conversionRate,
    averageDealSize,
    byStage,
    funnel,
    revenueByMonth,
  };
}
