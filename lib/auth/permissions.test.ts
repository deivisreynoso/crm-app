import { describe, expect, test } from "vitest";
import {
  canAccessFinances,
  canDeleteInvoice,
  canDeleteRecords,
  canExportCrmData,
  canManageTeamRoles,
  canViewAllContacts,
  canViewContact,
  canViewOpportunity,
  canVoidInvoice,
} from "./permissions";

describe("permissions", () => {
  test("only owner can delete invoices", () => {
    expect(canDeleteInvoice("owner", true)).toBe(true);
    expect(canDeleteInvoice("admin", false)).toBe(false);
    expect(canDeleteInvoice("finance", false)).toBe(false);
  });

  test("admin can void invoices but not delete", () => {
    expect(canVoidInvoice("admin", false)).toBe(true);
    expect(canDeleteInvoice("admin", false)).toBe(false);
  });

  test("finance can access finances but not delete records", () => {
    expect(canAccessFinances("finance", false)).toBe(true);
    expect(canDeleteRecords("finance", false)).toBe(false);
  });

  test("support sees all contacts; sales sees own and unassigned", () => {
    expect(canViewAllContacts("support", false)).toBe(true);
    expect(canViewContact("sales", false, null, "user-1")).toBe(true);
    expect(canViewContact("sales", false, "user-2", "user-1")).toBe(false);
    expect(canViewContact("sales", false, "user-1", "user-1")).toBe(true);
  });

  test("sales opportunity visibility", () => {
    expect(canViewOpportunity("sales", false, null, "user-1")).toBe(true);
    expect(canViewOpportunity("sales", false, "user-2", "user-1")).toBe(false);
    expect(canViewOpportunity("admin", false, "user-2", "user-1")).toBe(true);
  });

  test("only privileged roles manage team", () => {
    expect(canManageTeamRoles("owner", true)).toBe(true);
    expect(canManageTeamRoles("admin", false)).toBe(true);
    expect(canManageTeamRoles("sales", false)).toBe(false);
  });

  test("only owner and admin can export CRM data", () => {
    expect(canExportCrmData("owner", true)).toBe(true);
    expect(canExportCrmData("admin", false)).toBe(true);
    expect(canExportCrmData("finance", false)).toBe(false);
    expect(canExportCrmData("sales", false)).toBe(false);
    expect(canExportCrmData("support", false)).toBe(false);
  });
});
