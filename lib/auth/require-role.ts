import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import type { TeamRole } from "@/lib/team/workspace";

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireRoles(allowedRoles: TeamRole[]) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error } as const;

  const role = auth.isWorkspaceOwner ? "owner" : auth.role!;
  const effectiveRole = auth.isWorkspaceOwner ? "owner" : role;

  if (!allowedRoles.includes(effectiveRole)) {
    return { error: forbiddenResponse(`Role '${effectiveRole}' does not have permission`) } as const;
  }

  return { auth } as const;
}
