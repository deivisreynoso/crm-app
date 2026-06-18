import type { SupabaseClient } from "@supabase/supabase-js";
import type { PermissionGrant } from "@/lib/auth/permission-catalog";
import { isPermissionKey } from "@/lib/auth/permission-catalog";
import { resolveEffectivePermissions } from "@/lib/auth/effective-permissions";
import type { EffectivePermissions } from "@/lib/auth/effective-permissions";
import type { TeamRole } from "@/lib/team/workspace";

type GrantRow = {
  permission_key: string;
  effect: string;
};

async function loadCustomRoleGrants(
  supabase: SupabaseClient,
  customRoleId: string
): Promise<PermissionGrant[] | null> {
  const { data, error } = await supabase
    .from("workspace_permission_grants")
    .select("permission_key, effect")
    .eq("custom_role_id", customRoleId);

  if (error) {
    if (error.code === "42P01") return null;
    console.error("loadCustomRoleGrants:", error.message);
    return null;
  }

  return normalizeGrants(data ?? []);
}

async function loadPermissionSetGrants(
  supabase: SupabaseClient,
  memberId: string
): Promise<PermissionGrant[]> {
  const { data: links, error: linkError } = await supabase
    .from("team_member_permission_sets")
    .select("permission_set_id")
    .eq("member_id", memberId);

  if (linkError) {
    if (linkError.code === "42P01") return [];
    console.error("loadPermissionSetGrants links:", linkError.message);
    return [];
  }

  const setIds = (links ?? []).map((r) => r.permission_set_id as string);
  if (setIds.length === 0) return [];

  const { data, error } = await supabase
    .from("workspace_permission_grants")
    .select("permission_key, effect")
    .in("permission_set_id", setIds);

  if (error) {
    console.error("loadPermissionSetGrants:", error.message);
    return [];
  }

  return normalizeGrants(data ?? []);
}

function normalizeGrants(rows: GrantRow[]): PermissionGrant[] {
  const out: PermissionGrant[] = [];
  for (const row of rows) {
    if (!isPermissionKey(row.permission_key)) continue;
    if (row.effect !== "allow" && row.effect !== "deny") continue;
    out.push({
      permission_key: row.permission_key,
      effect: row.effect,
    });
  }
  return out;
}

export async function resolveMemberEffectivePermissions(
  supabase: SupabaseClient,
  input: {
    role: TeamRole;
    isWorkspaceOwner: boolean;
    memberId?: string | null;
    customRoleId?: string | null;
  }
): Promise<EffectivePermissions> {
  let customRoleGrants: PermissionGrant[] | null = null;
  if (input.customRoleId) {
    customRoleGrants = await loadCustomRoleGrants(supabase, input.customRoleId);
  }

  let permissionSetGrants: PermissionGrant[] = [];
  if (input.memberId) {
    permissionSetGrants = await loadPermissionSetGrants(supabase, input.memberId);
  }

  return resolveEffectivePermissions({
    role: input.role,
    isWorkspaceOwner: input.isWorkspaceOwner,
    customRoleGrants,
    permissionSetGrants,
  });
}
