import { createServerSideClient } from "@/lib/supabase";
import { resolveWebLeadsAssignee } from "@/lib/leads/resolve-web-leads-assignee";
import { canAccessFinances } from "@/lib/auth/permissions";
import type { EffectivePermissions } from "@/lib/auth/effective-permissions";
import { resolveMemberEffectivePermissions } from "@/lib/auth/resolve-member-permissions";
import { getClickIn360OrgUserId } from "@/lib/org/constants";
import { WorkspaceAccessDeniedError } from "@/lib/team/workspace-access";
import {
  canManageWorkspace,
  canWriteWorkspace,
} from "@/lib/team/capabilities";

import type { TeamRole } from "@/lib/team/roles";

export type { TeamRole };

export type WorkspaceCapabilities = {
  canWrite: boolean;
  canManage: boolean;
  isDemoViewer: boolean;
  canAccessFinances: boolean;
  canExport: boolean;
  canManageRoles: boolean;
};

export function workspaceCapabilities(
  role: TeamRole,
  isWorkspaceOwner: boolean,
  effective?: EffectivePermissions
) {
  return {
    canWrite: effective?.check("crm.write") ?? canWriteWorkspace(role),
    canManage:
      effective?.check("team.manage") ?? canManageWorkspace(role, isWorkspaceOwner),
    isDemoViewer: role === "viewer",
    canAccessFinances:
      effective?.check("finances.access") ??
      canAccessFinances(role, isWorkspaceOwner),
    canExport:
      effective?.check("crm.export") ??
      (isWorkspaceOwner || role === "admin"),
    canManageRoles:
      effective?.check("team.manage_roles") ??
      canManageWorkspace(role, isWorkspaceOwner),
  };
}

export { canManageWorkspace, canWriteWorkspace } from "@/lib/team/capabilities";

export type WorkspaceContext = {
  /** Authenticated user */
  actorUserId: string;
  /** CRM data tenant — owner's user id */
  workspaceOwnerId: string;
  role: TeamRole;
  isWorkspaceOwner: boolean;
  memberId?: string | null;
  customRoleId?: string | null;
  effectivePermissions: EffectivePermissions;
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
    const effectivePermissions = await resolveMemberEffectivePermissions(supabase, {
      role: "owner",
      isWorkspaceOwner: true,
    });
    return {
      actorUserId,
      workspaceOwnerId: orgOwnerId,
      role: "owner",
      isWorkspaceOwner: true,
      effectivePermissions,
    };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("id, owner_user_id, role, custom_role_id")
    .eq("member_user_id", actorUserId)
    .eq("owner_user_id", orgOwnerId)
    .maybeSingle();

  if (!membership?.owner_user_id) {
    throw new WorkspaceAccessDeniedError();
  }

  const role = mapTeamRole(membership.role as string);
  const effectivePermissions = await resolveMemberEffectivePermissions(supabase, {
    role,
    isWorkspaceOwner: false,
    memberId: membership.id as string,
    customRoleId: (membership.custom_role_id as string | null) ?? null,
  });

  return {
    actorUserId,
    workspaceOwnerId: membership.owner_user_id,
    role,
    isWorkspaceOwner: false,
    memberId: membership.id as string,
    customRoleId: (membership.custom_role_id as string | null) ?? null,
    effectivePermissions,
  };
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
