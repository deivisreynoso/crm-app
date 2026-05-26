import type { TeamRole } from "@/lib/team/workspace";

export const WORKSPACE_HEADER_ACTOR = "x-crm-workspace-actor";
export const WORKSPACE_HEADER_OWNER = "x-crm-workspace-owner-id";
export const WORKSPACE_HEADER_ROLE = "x-crm-workspace-role";
export const WORKSPACE_HEADER_IS_OWNER = "x-crm-workspace-is-owner";

const TRUSTED_WORKSPACE_HEADERS = [
  WORKSPACE_HEADER_ACTOR,
  WORKSPACE_HEADER_OWNER,
  WORKSPACE_HEADER_ROLE,
  WORKSPACE_HEADER_IS_OWNER,
] as const;

export function stripUntrustedWorkspaceHeaders(headers: Headers) {
  for (const name of TRUSTED_WORKSPACE_HEADERS) {
    headers.delete(name);
  }
}

export function setTrustedWorkspaceHeaders(
  headers: Headers,
  input: {
    actorUserId: string;
    workspaceOwnerId: string;
    role: TeamRole;
    isWorkspaceOwner: boolean;
  }
) {
  stripUntrustedWorkspaceHeaders(headers);
  headers.set(WORKSPACE_HEADER_ACTOR, input.actorUserId);
  headers.set(WORKSPACE_HEADER_OWNER, input.workspaceOwnerId);
  headers.set(WORKSPACE_HEADER_ROLE, input.role);
  headers.set(WORKSPACE_HEADER_IS_OWNER, input.isWorkspaceOwner ? "1" : "0");
}

export function readTrustedWorkspaceHeaders(
  headers: Headers,
  actorUserId: string
):
  | {
      workspaceOwnerId: string;
      role: TeamRole;
      isWorkspaceOwner: boolean;
    }
  | null {
  const headerActor = headers.get(WORKSPACE_HEADER_ACTOR);
  if (!headerActor || headerActor !== actorUserId) return null;

  const workspaceOwnerId = headers.get(WORKSPACE_HEADER_OWNER);
  const role = headers.get(WORKSPACE_HEADER_ROLE) as TeamRole | null;
  if (!workspaceOwnerId || !role) return null;

  const validRoles: TeamRole[] = ["owner", "admin", "sales", "viewer"];
  if (!validRoles.includes(role)) return null;

  return {
    workspaceOwnerId,
    role,
    isWorkspaceOwner: headers.get(WORKSPACE_HEADER_IS_OWNER) === "1",
  };
}
