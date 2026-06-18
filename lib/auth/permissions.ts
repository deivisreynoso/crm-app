import type { TeamRole } from "@/lib/team/roles";

export type { TeamRole };

export const TEAM_ROLES: TeamRole[] = [
  "owner",
  "admin",
  "finance",
  "sales",
  "support",
  "viewer",
];

export function isPrivilegedRole(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isWorkspaceOwner || role === "admin";
}

export function canDeleteRecords(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isPrivilegedRole(role, isWorkspaceOwner);
}

export function canDeleteInvoice(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isWorkspaceOwner;
}

export function canVoidInvoice(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isPrivilegedRole(role, isWorkspaceOwner);
}

export function canManageTeamRoles(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isPrivilegedRole(role, isWorkspaceOwner);
}

/** Owner and admin only — bulk CSV export of CRM data. */
export function canExportCrmData(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isPrivilegedRole(role, isWorkspaceOwner);
}

export function canAccessFinances(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isWorkspaceOwner || role === "admin" || role === "finance";
}

export function canWriteFinances(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return canAccessFinances(role, isWorkspaceOwner);
}

/** Sales sees only records they own; support/admin/owner see all contacts. */
export function canViewAllContacts(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isPrivilegedRole(role, isWorkspaceOwner) || role === "support";
}

export function canViewAllOpportunities(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return (
    isPrivilegedRole(role, isWorkspaceOwner) ||
    role === "support" ||
    role === "finance"
  );
}

export function canViewOwnedRecord(
  role: TeamRole,
  recordOwnerId: string | null | undefined,
  actorUserId: string
): boolean {
  if (!recordOwnerId) return role === "sales";
  return recordOwnerId === actorUserId;
}

export function canViewContact(
  role: TeamRole,
  isWorkspaceOwner: boolean,
  assignedTo: string | null | undefined,
  actorUserId: string
): boolean {
  if (canViewAllContacts(role, isWorkspaceOwner)) return true;
  if (role === "sales") {
    return !assignedTo || assignedTo === actorUserId;
  }
  if (role === "finance" || role === "viewer") return true;
  return false;
}

export function canViewOpportunity(
  role: TeamRole,
  isWorkspaceOwner: boolean,
  ownerId: string | null | undefined,
  actorUserId: string
): boolean {
  if (canViewAllOpportunities(role, isWorkspaceOwner)) return true;
  if (role === "sales") {
    return !ownerId || ownerId === actorUserId;
  }
  return false;
}
