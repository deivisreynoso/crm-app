import type { TeamRole } from "@/lib/team/roles";

export function canManageWorkspace(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isWorkspaceOwner || role === "admin";
}

export function canWriteWorkspace(role: TeamRole): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "sales" ||
    role === "support"
  );
}
