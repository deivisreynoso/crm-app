export interface PipelineStage {
  id: string;
  name: string;
  order: number;
}

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: "new_lead", name: "New Lead", order: 0 },
  { id: "qualified", name: "Qualified", order: 1 },
  { id: "nurturing", name: "Nurturing", order: 2 },
  { id: "booked", name: "Booked", order: 3 },
  { id: "closed_won", name: "Closed - Won", order: 4 },
  { id: "closed_lost", name: "Closed - Lost", order: 5 },
];

export function getStageName(
  stages: PipelineStage[],
  stageId: string
): string {
  return stages.find((s) => s.id === stageId)?.name ?? stageId;
}

export function sortStages(stages: PipelineStage[]): PipelineStage[] {
  return [...stages].sort((a, b) => a.order - b.order);
}
