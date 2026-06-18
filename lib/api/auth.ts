import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  canManageWorkspace,
  canWriteWorkspace,
  resolveWorkspaceContext,
  type TeamRole,
} from "@/lib/team/workspace";
import { isWorkspaceAccessDeniedError } from "@/lib/team/workspace-access";
import type { EffectivePermissions } from "@/lib/auth/effective-permissions";
import { canAccessFinances, canExportCrmData } from "@/lib/auth/permissions";

export type AuthContext = {
  session: Session;
  userId: string;
  workspaceOwnerId: string;
  role: TeamRole;
  isWorkspaceOwner: boolean;
  effectivePermissions: EffectivePermissions;
  error: null;
};

export async function requireAuth(): Promise<
  | AuthContext
  | {
      session: null;
      userId: null;
      workspaceOwnerId: null;
      role: null;
      isWorkspaceOwner: false;
      effectivePermissions: null;
      error: NextResponse;
    }
> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!session?.user || !userId) {
    return {
      session: null,
      userId: null,
      workspaceOwnerId: null,
      role: null,
      isWorkspaceOwner: false,
      effectivePermissions: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  let workspace;
  try {
    workspace = await resolveWorkspaceContext(userId);
  } catch (err) {
    if (isWorkspaceAccessDeniedError(err)) {
      return {
        session: null,
        userId: null,
        workspaceOwnerId: null,
        role: null,
        isWorkspaceOwner: false,
        effectivePermissions: null,
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
    throw err;
  }

  return {
    session,
    userId,
    workspaceOwnerId: workspace.workspaceOwnerId,
    role: workspace.role,
    isWorkspaceOwner: workspace.isWorkspaceOwner,
    effectivePermissions: workspace.effectivePermissions,
    error: null,
  };
}

export function requireWorkspaceOwner(isWorkspaceOwner: boolean) {
  if (!isWorkspaceOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireWorkspaceManage(
  role: TeamRole,
  isWorkspaceOwner: boolean
) {
  if (!canManageWorkspace(role, isWorkspaceOwner)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireWorkspaceWrite(role: TeamRole) {
  if (!canWriteWorkspace(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireFinanceAccess(
  role: TeamRole,
  isWorkspaceOwner: boolean
) {
  if (!canAccessFinances(role, isWorkspaceOwner)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireCrmDataExport(
  role: TeamRole,
  isWorkspaceOwner: boolean,
  effective?: EffectivePermissions
) {
  if (effective?.check("crm.export") === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (effective?.check("crm.export") === true) return null;
  if (!canExportCrmData(role, isWorkspaceOwner)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
