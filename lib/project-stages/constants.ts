export const PROJECT_STAGES = [
  "onboarding",
  "design",
  "setup",
  "launch",
  "optimization",
  "complete",
  "maintenance",
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];

export function isProjectStage(value: string): value is ProjectStage {
  return (PROJECT_STAGES as readonly string[]).includes(value);
}

export function nextProjectStage(
  current: ProjectStage,
  options?: { maintenanceEnabled?: boolean }
): ProjectStage | null {
  const maintenanceEnabled = options?.maintenanceEnabled ?? true;
  const order: ProjectStage[] = maintenanceEnabled
    ? [...PROJECT_STAGES]
    : PROJECT_STAGES.filter((s) => s !== "maintenance");
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1] ?? null;
}

export function isWonPipelineStage(stageId: string, stageName?: string): boolean {
  if (stageId === "closed_won") return true;
  if (/won|closed.?won/i.test(stageId)) return true;
  if (stageName && /won|closed.?won/i.test(stageName)) return true;
  return false;
}
