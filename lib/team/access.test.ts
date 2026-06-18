import { describe, expect, test } from "vitest";
import { userCanAccessCrm } from "./access";

function mockSupabase(rows: { id?: string } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: rows }),
          }),
          limit: async () => ({ data: rows ? [rows] : [] }),
        }),
      }),
    }),
  } as never;
}

describe("userCanAccessCrm", () => {
  const orgId = "00000000-0000-4000-8000-000000000001";

  test("org owner UUID is allowed without team_members row", async () => {
    const prev = process.env.CLICKIN360_ORG_USER_ID;
    process.env.CLICKIN360_ORG_USER_ID = orgId;
    try {
      const allowed = await userCanAccessCrm(mockSupabase(null), orgId);
      expect(allowed).toBe(true);
    } finally {
      process.env.CLICKIN360_ORG_USER_ID = prev;
    }
  });

  test("teammate with membership is allowed", async () => {
    const prev = process.env.CLICKIN360_ORG_USER_ID;
    process.env.CLICKIN360_ORG_USER_ID = orgId;
    try {
      const allowed = await userCanAccessCrm(
        mockSupabase({ id: "member-row" }),
        "00000000-0000-4000-8000-000000000099"
      );
      expect(allowed).toBe(true);
    } finally {
      process.env.CLICKIN360_ORG_USER_ID = prev;
    }
  });

  test("user without membership is denied", async () => {
    const prev = process.env.CLICKIN360_ORG_USER_ID;
    process.env.CLICKIN360_ORG_USER_ID = orgId;
    try {
      const allowed = await userCanAccessCrm(
        mockSupabase(null),
        "00000000-0000-4000-8000-000000000099"
      );
      expect(allowed).toBe(false);
    } finally {
      process.env.CLICKIN360_ORG_USER_ID = prev;
    }
  });
});
