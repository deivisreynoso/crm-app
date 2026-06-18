import { describe, expect, test } from "vitest";
import {
  isLostStageId,
  isLostStageName,
  isWonStageName,
} from "@/lib/opportunities/stage-outcome";

const CLOSED_STAGE_IDS = new Set(["closed_won", "closed_lost", "won", "lost"]);

function isClosedOpportunityStage(stage: string | null | undefined): boolean {
  const raw = String(stage ?? "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (CLOSED_STAGE_IDS.has(lower)) return true;
  if (isLostStageId(raw) || isLostStageName(raw) || isWonStageName(raw)) {
    return true;
  }
  return false;
}

describe("website-opportunity closed stages", () => {
  test("recognizes stage ids and display names", () => {
    expect(isClosedOpportunityStage("closed_lost")).toBe(true);
    expect(isClosedOpportunityStage("Closed - Lost")).toBe(true);
    expect(isClosedOpportunityStage("closed_won")).toBe(true);
    expect(isClosedOpportunityStage("Won")).toBe(true);
    expect(isClosedOpportunityStage("qualified")).toBe(false);
    expect(isClosedOpportunityStage("booked")).toBe(false);
  });
});
