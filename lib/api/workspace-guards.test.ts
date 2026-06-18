import { describe, expect, test } from "vitest";
import {
  crmDataExportForbidden,
  financeAccessForbidden,
  isPublicApiRoute,
  workspaceWriteForbidden,
} from "./workspace-guards";
import { isN8nIntegrationRoute } from "@/lib/integrations/n8n-integration-routes";

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

  test("export routes blocked for non-admin roles", () => {
    expect(
      crmDataExportForbidden("sales", false, "/api/contacts/export", "GET")
    ).toBe(true);
    expect(
      crmDataExportForbidden("admin", false, "/api/contacts/export", "GET")
    ).toBe(false);
    expect(
      crmDataExportForbidden(
        "finance",
        false,
        "/api/finances/invoices/export",
        "GET"
      )
    ).toBe(true);
  });

  test("n8n integration route patterns", () => {
    expect(isN8nIntegrationRoute("/api/onboarding/kickoff")).toBe(true);
    expect(isN8nIntegrationRoute("/api/opportunities/close-won")).toBe(true);
    expect(
      isN8nIntegrationRoute(
        "/api/project-feedback/abc/google-review-sent"
      )
    ).toBe(true);
    expect(isN8nIntegrationRoute("/api/contacts/abc/activities")).toBe(true);
    expect(isN8nIntegrationRoute("/api/contacts")).toBe(false);
  });
});
