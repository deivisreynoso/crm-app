import { describe, expect, test } from "vitest";
import {
  financeAccessForbidden,
  isPublicApiRoute,
  workspaceWriteForbidden,
} from "./workspace-guards";

describe("workspace-guards", () => {
  test("finance API blocked for sales", () => {
    expect(
      financeAccessForbidden("sales", false, "/api/finances/invoices")
    ).toBe(true);
    expect(
      financeAccessForbidden("finance", false, "/api/finances/invoices")
    ).toBe(false);
  });

  test("finance role cannot write CRM routes", () => {
    expect(
      workspaceWriteForbidden("finance", false, "/api/contacts", "POST")
    ).toBe(true);
    expect(
      workspaceWriteForbidden("finance", false, "/api/finances/invoices", "POST")
    ).toBe(false);
  });

  test("customer API is public", () => {
    expect(isPublicApiRoute("/api/customer/bookings")).toBe(true);
  });
});
