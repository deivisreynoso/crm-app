import type { TeamRole } from "@/lib/team/workspace";
import { canManageWorkspace } from "@/lib/team/workspace";

/** Non-admin users may only assign calendar events to themselves. */
export function assertCalendarAssigneePermission(
  role: TeamRole,
  isWorkspaceOwner: boolean,
  actorUserId: string,
  requestedAssignee: string | null | undefined
): string | null {
  const assignee = requestedAssignee?.trim() || actorUserId;
  if (assignee === actorUserId) return assignee;
  if (canManageWorkspace(role, isWorkspaceOwner)) return assignee;
  return null;
}
