import { getServerSession, type Session } from "next-auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { readTrustedWorkspaceHeaders } from "@/lib/api/workspace-headers";
import {
  canManageWorkspace,
  canWriteWorkspace,
  resolveWorkspaceContext,
  type TeamRole,
} from "@/lib/team/workspace";

export type AuthContext = {
  session: Session;
  userId: string;
  workspaceOwnerId: string;
  role: TeamRole;
  isWorkspaceOwner: boolean;
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
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const headerStore = await headers();
  const cached = readTrustedWorkspaceHeaders(headerStore, userId);
  const workspace = cached
    ? {
        actorUserId: userId,
        workspaceOwnerId: cached.workspaceOwnerId,
        role: cached.role,
        isWorkspaceOwner: cached.isWorkspaceOwner,
      }
    : await resolveWorkspaceContext(userId);

  return {
    session,
    userId,
    workspaceOwnerId: workspace.workspaceOwnerId,
    role: workspace.role,
    isWorkspaceOwner: workspace.isWorkspaceOwner,
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
