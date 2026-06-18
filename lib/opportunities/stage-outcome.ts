export function isWonStageName(name: string): boolean {
  return /won|closed.?won/i.test(name.trim());
}

export function isLostStageName(name: string): boolean {
  return /lost|closed.?lost/i.test(name.trim());
}

export function isLostStageId(stageId: string): boolean {
  return /lost|closed.?lost/i.test(stageId.trim());
}
