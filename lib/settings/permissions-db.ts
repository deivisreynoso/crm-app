import type { SupabaseClient } from "@supabase/supabase-js";
import type { PermissionGrant, PermissionKey } from "@/lib/auth/permission-catalog";
import { isPermissionKey } from "@/lib/auth/permission-catalog";
import { grantsFromMap } from "@/lib/auth/effective-permissions";
import { roleTemplatePermissions } from "@/lib/auth/role-templates";
import type { TeamRole } from "@/lib/team/workspace";

export type CustomRoleRow = {
  id: string;
  name: string;
  description: string | null;
  base_role: TeamRole;
  grants: PermissionGrant[];
};

export type PermissionSetRow = {
  id: string;
  name: string;
  description: string | null;
  grants: PermissionGrant[];
};

function mapGrantRows(
  rows: { permission_key: string; effect: string }[]
): PermissionGrant[] {
  return rows
    .filter(
      (r) =>
        isPermissionKey(r.permission_key) &&
        (r.effect === "allow" || r.effect === "deny")
    )
    .map((r) => ({
      permission_key: r.permission_key as PermissionKey,
      effect: r.effect as "allow" | "deny",
    }));
}

export async function listCustomRoles(
  supabase: SupabaseClient,
  ownerUserId: string
): Promise<CustomRoleRow[]> {
  const { data: roles, error } = await supabase
    .from("workspace_custom_roles")
    .select("id, name, description, base_role")
    .eq("owner_user_id", ownerUserId)
    .order("name");

  if (error) throw new Error(error.message);
  if (!roles?.length) return [];

  const ids = roles.map((r) => r.id as string);
  const { data: grants } = await supabase
    .from("workspace_permission_grants")
    .select("custom_role_id, permission_key, effect")
    .in("custom_role_id", ids);

  const byRole = new Map<string, PermissionGrant[]>();
  for (const g of grants ?? []) {
    const id = g.custom_role_id as string;
    const list = byRole.get(id) ?? [];
    list.push(...mapGrantRows([g]));
    byRole.set(id, list);
  }

  return roles.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    base_role: r.base_role as TeamRole,
    grants: byRole.get(r.id as string) ?? [],
  }));
}

export async function createCustomRole(
  supabase: SupabaseClient,
  ownerUserId: string,
  input: {
    name: string;
    description?: string | null;
    base_role: TeamRole;
    grants?: PermissionGrant[];
  }
): Promise<CustomRoleRow> {
  const template = roleTemplatePermissions(input.base_role, false);
  const grants =
    (input.grants?.length ?? 0) > 0
      ? input.grants!
      : grantsFromMap(template);

  const { data: role, error } = await supabase
    .from("workspace_custom_roles")
    .insert([
      {
        owner_user_id: ownerUserId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        base_role: input.base_role,
      },
    ])
    .select("id, name, description, base_role")
    .single();

  if (error || !role) throw new Error(error?.message ?? "Failed to create role");

  await replaceCustomRoleGrants(
    supabase,
    ownerUserId,
    role.id as string,
    grants
  );

  return {
    id: role.id as string,
    name: role.name as string,
    description: (role.description as string | null) ?? null,
    base_role: role.base_role as TeamRole,
    grants,
  };
}

export async function replaceCustomRoleGrants(
  supabase: SupabaseClient,
  ownerUserId: string,
  customRoleId: string,
  grants: PermissionGrant[]
) {
  await supabase
    .from("workspace_permission_grants")
    .delete()
    .eq("custom_role_id", customRoleId);

  if (!grants.length) return;

  const { error } = await supabase.from("workspace_permission_grants").insert(
    grants.map((g) => ({
      owner_user_id: ownerUserId,
      custom_role_id: customRoleId,
      permission_key: g.permission_key,
      effect: g.effect,
    }))
  );
  if (error) throw new Error(error.message);
}

export async function listPermissionSets(
  supabase: SupabaseClient,
  ownerUserId: string
): Promise<PermissionSetRow[]> {
  const { data: sets, error } = await supabase
    .from("workspace_permission_sets")
    .select("id, name, description")
    .eq("owner_user_id", ownerUserId)
    .order("name");

  if (error) throw new Error(error.message);
  if (!sets?.length) return [];

  const ids = sets.map((s) => s.id as string);
  const { data: grants } = await supabase
    .from("workspace_permission_grants")
    .select("permission_set_id, permission_key, effect")
    .in("permission_set_id", ids);

  const bySet = new Map<string, PermissionGrant[]>();
  for (const g of grants ?? []) {
    const id = g.permission_set_id as string;
    const list = bySet.get(id) ?? [];
    list.push(...mapGrantRows([g]));
    bySet.set(id, list);
  }

  return sets.map((s) => ({
    id: s.id as string,
    name: s.name as string,
    description: (s.description as string | null) ?? null,
    grants: bySet.get(s.id as string) ?? [],
  }));
}

export async function createPermissionSet(
  supabase: SupabaseClient,
  ownerUserId: string,
  input: {
    name: string;
    description?: string | null;
    grants: PermissionGrant[];
  }
): Promise<PermissionSetRow> {
  const { data: set, error } = await supabase
    .from("workspace_permission_sets")
    .insert([
      {
        owner_user_id: ownerUserId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      },
    ])
    .select("id, name, description")
    .single();

  if (error || !set) throw new Error(error?.message ?? "Failed to create set");

  await replacePermissionSetGrants(
    supabase,
    ownerUserId,
    set.id as string,
    input.grants
  );

  return {
    id: set.id as string,
    name: set.name as string,
    description: (set.description as string | null) ?? null,
    grants: input.grants,
  };
}

export async function replacePermissionSetGrants(
  supabase: SupabaseClient,
  ownerUserId: string,
  permissionSetId: string,
  grants: PermissionGrant[]
) {
  await supabase
    .from("workspace_permission_grants")
    .delete()
    .eq("permission_set_id", permissionSetId);

  if (!grants.length) return;

  const { error } = await supabase.from("workspace_permission_grants").insert(
    grants.map((g) => ({
      owner_user_id: ownerUserId,
      permission_set_id: permissionSetId,
      permission_key: g.permission_key,
      effect: g.effect,
    }))
  );
  if (error) throw new Error(error.message);
}
