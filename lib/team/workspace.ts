import { createServerSideClient } from "@/lib/supabase";
import { resolveWebLeadsAssignee } from "@/lib/leads/resolve-web-leads-assignee";
import { canAccessFinances } from "@/lib/auth/permissions";
import { getClickIn360OrgUserId } from "@/lib/org/constants";
import { WorkspaceAccessDeniedError } from "@/lib/team/workspace-access";

export type TeamRole = "owner" | "admin" | "finance" | "sales" | "support" | "viewer";

export type WorkspaceCapabilities = {
  canWrite: boolean;
  canManage: boolean;
  isDemoViewer: boolean;
  canAccessFinances: boolean;
};

export function workspaceCapabilities(
  role: TeamRole,
  isWorkspaceOwner: boolean
): WorkspaceCapabilities {
  return {
    canWrite: canWriteWorkspace(role),
    canManage: canManageWorkspace(role, isWorkspaceOwner),
    isDemoViewer: role === "viewer",
    canAccessFinances: canAccessFinances(role, isWorkspaceOwner),
  };
}

export function canManageWorkspace(
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  return isWorkspaceOwner || role === "admin";
}

export type WorkspaceContext = {
  /** Authenticated user */
  actorUserId: string;
  /** CRM data tenant — owner's user id */
  workspaceOwnerId: string;
  role: TeamRole;
  isWorkspaceOwner: boolean;
};

function mapTeamRole(dbRole: string): TeamRole {
  if (dbRole === "viewer") return "viewer";
  if (dbRole === "admin") return "admin";
  if (dbRole === "finance") return "finance";
  if (dbRole === "support") return "support";
  return "sales";
}

export async function resolveWorkspaceContext(
  actorUserId: string
): Promise<WorkspaceContext> {
  const supabase = createServerSideClient();
  const orgOwnerId = getClickIn360OrgUserId();

  if (actorUserId === orgOwnerId) {
    return {
      actorUserId,
      workspaceOwnerId: orgOwnerId,
      role: "owner",
      isWorkspaceOwner: true,
    };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("owner_user_id, role")
    .eq("member_user_id", actorUserId)
    .eq("owner_user_id", orgOwnerId)
    .maybeSingle();

  if (!membership?.owner_user_id) {
    throw new WorkspaceAccessDeniedError();
  }

  return {
    actorUserId,
    workspaceOwnerId: membership.owner_user_id,
    role: mapTeamRole(membership.role as string),
    isWorkspaceOwner: false,
  };
}

export function canWriteWorkspace(role: TeamRole): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "sales" ||
    role === "support"
  );
}

export async function getWorkspaceWebsiteLeadsConfig(workspaceOwnerId: string) {
  const supabase = createServerSideClient();

  const ownerId = getClickIn360OrgUserId();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_sales_assignee")
    .eq("user_id", ownerId)
    .maybeSingle();

  const defaultSalesAssignee = await resolveWebLeadsAssignee(
    supabase,
    ownerId,
    (settings?.default_sales_assignee as string | null) ?? null
  );

  return {
    workspaceOwnerId: ownerId,
    defaultSalesAssignee,
  };
}
