import type { TeamRole } from "@/lib/team/workspace";
import { canManageWorkspace, canWriteWorkspace } from "@/lib/team/workspace";

export function canManageFinances(role: TeamRole, isWorkspaceOwner: boolean): boolean {
  return canManageWorkspace(role, isWorkspaceOwner);
}

/** Create/edit invoices, payment links, and income transactions (sales+). */
export function canWriteFinances(role: TeamRole): boolean {
  return canWriteWorkspace(role);
}

export function canViewExpenseData(role: TeamRole, isWorkspaceOwner: boolean): boolean {
  return canManageWorkspace(role, isWorkspaceOwner);
}

export function canDeleteInvoices(isWorkspaceOwner: boolean): boolean {
  return isWorkspaceOwner;
}
