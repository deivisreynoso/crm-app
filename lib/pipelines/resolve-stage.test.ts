import { describe, expect, test } from "vitest";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants/pipelines";

describe("pipeline stages", () => {
  test("default pipeline includes qualified and closed_lost ids", () => {
    const ids = DEFAULT_PIPELINE_STAGES.map((s) => s.id);
    expect(ids).toContain("qualified");
    expect(ids).toContain("closed_lost");
  });

  test("website lead stage id matches pipeline qualified id", () => {
    const qualified = DEFAULT_PIPELINE_STAGES.find((s) => s.id === "qualified");
    expect(qualified?.name).toMatch(/qualified/i);
    expect(qualified?.id).toBe("qualified");
  });
});
