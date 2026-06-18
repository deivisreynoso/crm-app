import type { PermissionKey } from "@/lib/auth/permission-catalog";
import type { TeamRole } from "@/lib/team/roles";

/** Default permission profile per built-in role (Salesforce standard role templates). */
export function roleTemplatePermissions(
  role: TeamRole,
  isWorkspaceOwner: boolean
): Map<PermissionKey, boolean> {
  const all = (keys: PermissionKey[]) =>
    new Map(keys.map((k) => [k, true] as const));

  if (isWorkspaceOwner || role === "owner") {
    return all([
      "crm.read",
      "crm.write",
      "crm.delete",
      "crm.export",
      "contacts.view_all",
      "opportunities.view_all",
      "finances.access",
      "finances.write",
      "finances.void_invoice",
      "finances.delete_invoice",
      "team.manage",
      "team.manage_roles",
      "settings.manage",
      "conversations.access",
      "tickets.view_all",
      "analytics.access",
    ]);
  }

  if (role === "admin") {
    return all([
      "crm.read",
      "crm.write",
      "crm.delete",
      "crm.export",
      "contacts.view_all",
      "opportunities.view_all",
      "finances.access",
      "finances.write",
      "finances.void_invoice",
      "team.manage",
      "team.manage_roles",
      "settings.manage",
      "conversations.access",
      "tickets.view_all",
      "analytics.access",
    ]);
  }

  if (role === "finance") {
    return new Map([
      ["crm.read", true],
      ["contacts.view_all", true],
      ["opportunities.view_all", true],
      ["finances.access", true],
      ["finances.write", true],
      ["finances.void_invoice", true],
      ["analytics.access", true],
    ] as [PermissionKey, boolean][]);
  }

  if (role === "support") {
    return new Map([
      ["crm.read", true],
      ["crm.write", true],
      ["contacts.view_all", true],
      ["opportunities.view_all", true],
      ["conversations.access", true],
      ["tickets.view_all", true],
    ] as [PermissionKey, boolean][]);
  }

  if (role === "sales") {
    return new Map([
      ["crm.read", true],
      ["crm.write", true],
      ["conversations.access", true],
    ] as [PermissionKey, boolean][]);
  }

  // viewer
  return new Map([["crm.read", true]] as [PermissionKey, boolean][]);
}
