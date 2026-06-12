import type { TeamRole } from "@/lib/team/workspace";
import { canManageWorkspace } from "@/lib/team/workspace";

export function canManageFinances(role: TeamRole, isWorkspaceOwner: boolean): boolean {
  return canManageWorkspace(role, isWorkspaceOwner);
}

export function canViewExpenseData(role: TeamRole, isWorkspaceOwner: boolean): boolean {
  return canManageWorkspace(role, isWorkspaceOwner);
}
