/**
 * Granular CRM permissions (Salesforce-style permission catalog).
 * Custom roles and permission sets reference these keys.
 */
export const PERMISSION_KEYS = [
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
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionEffect = "allow" | "deny";

export type PermissionGrant = {
  permission_key: PermissionKey;
  effect: PermissionEffect;
};

export type PermissionCategory = {
  id: string;
  label: string;
  description?: string;
  permissions: {
    key: PermissionKey;
    label: string;
    description?: string;
  }[];
};

/** Permission tree for settings UI (similar to Salesforce role editor). */
export const PERMISSION_CATALOG: PermissionCategory[] = [
  {
    id: "crm",
    label: "CRM",
    description: "Core customer records and pipeline",
    permissions: [
      { key: "crm.read", label: "View CRM records" },
      { key: "crm.write", label: "Create and edit CRM records" },
      { key: "crm.delete", label: "Delete contacts and opportunities" },
      { key: "crm.export", label: "Export data (CSV)" },
      { key: "contacts.view_all", label: "View all contacts" },
      { key: "opportunities.view_all", label: "View all opportunities" },
    ],
  },
  {
    id: "finances",
    label: "Finances",
    permissions: [
      { key: "finances.access", label: "Access finances module" },
      { key: "finances.write", label: "Create and edit invoices and transactions" },
      { key: "finances.void_invoice", label: "Void invoices" },
      { key: "finances.delete_invoice", label: "Delete invoices (owner only by default)" },
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    permissions: [
      { key: "conversations.access", label: "Access conversations inbox" },
      { key: "tickets.view_all", label: "View all support tickets" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    permissions: [
      { key: "team.manage", label: "Manage workspace settings" },
      { key: "team.manage_roles", label: "Manage team roles and permission sets" },
      { key: "settings.manage", label: "Edit integrations and templates" },
      { key: "analytics.access", label: "View analytics dashboard" },
    ],
  },
];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}
