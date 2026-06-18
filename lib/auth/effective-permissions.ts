import type {
  PermissionGrant,
  PermissionKey,
} from "@/lib/auth/permission-catalog";
import { PERMISSION_KEYS } from "@/lib/auth/permission-catalog";
import { roleTemplatePermissions } from "@/lib/auth/role-templates";
import type { TeamRole } from "@/lib/team/roles";

export type EffectivePermissions = {
  check: (key: PermissionKey) => boolean;
  granted: Set<PermissionKey>;
  denied: Set<PermissionKey>;
};

/**
 * Resolve effective permissions (Salesforce-style):
 * 1. Start from built-in role template (or custom role grants when provided).
 * 2. Apply permission sets — deny wins over allow (most restrictive).
 */
export function resolveEffectivePermissions(input: {
  role: TeamRole;
  isWorkspaceOwner: boolean;
  customRoleGrants?: PermissionGrant[] | null;
  permissionSetGrants?: PermissionGrant[];
}): EffectivePermissions {
  if (input.isWorkspaceOwner) {
    const all = new Set(PERMISSION_KEYS);
    return {
      granted: all,
      denied: new Set(),
      check: () => true,
    };
  }

  const granted = new Set<PermissionKey>();
  const denied = new Set<PermissionKey>();

  const base = input.customRoleGrants?.length
    ? grantsToMap(input.customRoleGrants)
    : roleTemplatePermissions(input.role, false);

  for (const [key, allowed] of base.entries()) {
    if (allowed) granted.add(key);
    else denied.add(key);
  }

  for (const grant of input.permissionSetGrants ?? []) {
    if (grant.effect === "deny") {
      granted.delete(grant.permission_key);
      denied.add(grant.permission_key);
    } else if (!denied.has(grant.permission_key)) {
      granted.add(grant.permission_key);
    }
  }

  return {
    granted,
    denied,
    check: (key: PermissionKey) => granted.has(key) && !denied.has(key),
  };
}

function grantsToMap(grants: PermissionGrant[]): Map<PermissionKey, boolean> {
  const map = new Map<PermissionKey, boolean>();
  for (const grant of grants) {
    map.set(grant.permission_key, grant.effect === "allow");
  }
  return map;
}

export function grantsFromMap(
  map: Map<PermissionKey, boolean>
): PermissionGrant[] {
  return [...map.entries()].map(([permission_key, allowed]) => ({
    permission_key,
    effect: allowed ? "allow" : "deny",
  }));
}
