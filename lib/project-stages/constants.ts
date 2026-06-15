export const PROJECT_STAGES = [
  "onboarding",
  "design",
  "setup",
  "launch",
  "optimization",
  "complete",
  "maintenance",
] as const;

/** Post-sale delivery path shown in UI (excludes maintenance). */
export const DELIVERY_PROJECT_STAGES = [
  "onboarding",
  "design",
  "setup",
  "launch",
  "optimization",
  "complete",
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];
export type DeliveryProjectStage = (typeof DELIVERY_PROJECT_STAGES)[number];

export function isDeliveryProjectStage(value: string): value is DeliveryProjectStage {
  return (DELIVERY_PROJECT_STAGES as readonly string[]).includes(value);
}

export function isProjectStage(value: string): value is ProjectStage {
  return (PROJECT_STAGES as readonly string[]).includes(value);
}

export function nextProjectStage(
  current: ProjectStage,
  options?: { includeMaintenance?: boolean }
): ProjectStage | null {
  const order: ProjectStage[] = options?.includeMaintenance
    ? [...PROJECT_STAGES]
    : [...DELIVERY_PROJECT_STAGES];
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
