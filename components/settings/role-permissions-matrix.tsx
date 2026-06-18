"use client";

import type { TeamRole } from "@/lib/team/roles";
import {
  canAccessFinances,
  canDeleteRecords,
  canExportCrmData,
  canManageTeamRoles,
  canViewAllContacts,
  canViewAllOpportunities,
} from "@/lib/auth/permissions";
import { canWriteWorkspace } from "@/lib/team/capabilities";

type MatrixRole = Exclude<TeamRole, "owner">;

const ROLES: MatrixRole[] = ["admin", "finance", "sales", "support", "viewer"];

const ROWS: {
  label: string;
  check: (role: MatrixRole) => boolean;
}[] = [
  {
    label: "Write CRM data",
    check: (role) => canWriteWorkspace(role),
  },
  {
    label: "Manage workspace settings",
    check: (role) => canManageTeamRoles(role, role === "admin"),
  },
  {
    label: "Access finances",
    check: (role) => canAccessFinances(role, false),
  },
  {
    label: "Delete contacts & opportunities",
    check: (role) => canDeleteRecords(role, false),
  },
  {
    label: "Export CRM data (CSV)",
    check: (role) => canExportCrmData(role, false),
  },
  {
    label: "View all contacts",
    check: (role) => canViewAllContacts(role, false),
  },
  {
    label: "View all opportunities",
    check: (role) => canViewAllOpportunities(role, false),
  },
];

function Cell({ allowed }: { allowed: boolean }) {
  return (
    <td className="px-3 py-2 text-center text-sm">
      <span
        className={
          allowed
            ? "text-emerald-700 font-medium"
            : "text-body-muted"
        }
        aria-label={allowed ? "Allowed" : "Not allowed"}
      >
        {allowed ? "✓" : "—"}
      </span>
    </td>
  );
}

export function RolePermissionsMatrix() {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)]">
            <th className="px-3 py-2 text-left font-semibold text-heading">
              Capability
            </th>
            {ROLES.map((role) => (
              <th
                key={role}
                className="px-3 py-2 text-center font-semibold text-heading capitalize"
              >
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr
              key={row.label}
              className="border-b border-[var(--card-border)] last:border-0"
            >
              <td className="px-3 py-2 text-body-muted">{row.label}</td>
              {ROLES.map((role) => (
                <Cell key={role} allowed={row.check(role)} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-body-muted border-t border-[var(--card-border)]">
        Workspace owner has full access. Sales users see their own records plus unassigned queue items.
      </p>
    </div>
  );
}
