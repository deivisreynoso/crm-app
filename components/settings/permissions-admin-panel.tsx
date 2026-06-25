"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { PERMISSION_CATALOG } from "@/lib/auth/permission-catalog";
import type { PermissionGrant, PermissionKey } from "@/lib/auth/permission-catalog";
import { formatApiError } from "@/lib/validation-errors";

type CustomRole = {
  id: string;
  name: string;
  description: string | null;
  base_role: string;
  grants: PermissionGrant[];
};

type PermissionSet = {
  id: string;
  name: string;
  description: string | null;
  grants: PermissionGrant[];
};

function grantsToRecord(grants: PermissionGrant[]): Record<PermissionKey, boolean> {
  const out = {} as Record<PermissionKey, boolean>;
  for (const g of grants) {
    out[g.permission_key] = g.effect === "allow";
  }
  return out;
}

function recordToGrants(record: Record<string, boolean>): PermissionGrant[] {
  return Object.entries(record)
    .filter(([, allowed]) => allowed)
    .map(([permission_key]) => ({
      permission_key: permission_key as PermissionKey,
      effect: "allow" as const,
    }));
}

function PermissionTree({
  value,
  onChange,
}: {
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
}) {
  return (
    <div className="space-y-4 max-h-72 overflow-y-auto border border-[var(--card-border)] rounded-lg p-3">
      {PERMISSION_CATALOG.map((category) => (
        <div key={category.id}>
          <p className="text-xs font-semibold text-heading mb-2">{category.label}</p>
          <ul className="space-y-1.5">
            {category.permissions.map((perm) => (
              <li key={perm.key}>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(value[perm.key])}
                    onChange={(e) =>
                      onChange({ ...value, [perm.key]: e.target.checked })
                    }
                  />
                  <span>
                    <span className="text-heading">{perm.label}</span>
                    {perm.description && (
                      <span className="block text-xs text-body-muted">
                        {perm.description}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PermissionsAdminPanel() {
  const [tab, setTab] = useState<"roles" | "sets">("roles");
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [sets, setSets] = useState<PermissionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [roleName, setRoleName] = useState("");
  const [roleBase, setRoleBase] = useState("sales");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [rolePerms, setRolePerms] = useState<Record<string, boolean>>({});

  const [setName, setSetName] = useState("");
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [setPerms, setSetPerms] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, setsRes] = await Promise.all([
        axios.get<{ data: CustomRole[] }>("/api/settings/custom-roles"),
        axios.get<{ data: PermissionSet[] }>("/api/settings/permission-sets"),
      ]);
      setRoles(rolesRes.data.data ?? []);
      setSets(setsRes.data.data ?? []);
    } catch (err) {
      setError(formatApiError(err, "Failed to load permissions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      await axios.post("/api/settings/custom-roles", {
        name: roleName,
        base_role: roleBase,
        grants: recordToGrants(rolePerms),
      });
      setRoleName("");
      setRolePerms({});
      setMsg("Custom role created.");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not create role."));
    }
  }

  async function saveRoleGrants() {
    if (!editingRoleId) return;
    setError(null);
    try {
      await axios.patch(`/api/settings/custom-roles/${editingRoleId}`, {
        grants: recordToGrants(rolePerms),
      });
      setMsg("Role permissions saved.");
      setEditingRoleId(null);
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not save role."));
    }
  }

  async function createSet(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await axios.post("/api/settings/permission-sets", {
        name: setName,
        grants: recordToGrants(setPerms),
      });
      setSetName("");
      setSetPerms({});
      setMsg("Permission set created.");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not create permission set."));
    }
  }

  async function saveSetGrants() {
    if (!editingSetId) return;
    setError(null);
    try {
      await axios.patch(`/api/settings/permission-sets/${editingSetId}`, {
        grants: recordToGrants(setPerms),
      });
      setMsg("Permission set saved.");
      setEditingSetId(null);
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not save permission set."));
    }
  }

  if (loading) {
    return <p className="text-sm text-body-muted">Loading permissions…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        Modelled after Salesforce: standard roles are templates; custom roles define a full
        permission profile; permission sets add (or deny) access on top. Deny always wins.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            tab === "roles"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-[var(--card-border)] text-body-muted"
          }`}
        >
          Custom roles
        </button>
        <button
          type="button"
          onClick={() => setTab("sets")}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            tab === "sets"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-[var(--card-border)] text-body-muted"
          }`}
        >
          Permission sets
        </button>
      </div>

      {msg && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
          {msg}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {tab === "roles" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={(e) => void createRole(e)} className="space-y-3">
            <h4 className="text-sm font-semibold text-heading">New custom role</h4>
            <div>
              <FormLabel htmlFor="role-name">Name</FormLabel>
              <input
                id="role-name"
                className="input-field w-full"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
              />
            </div>
            <div>
              <FormLabel htmlFor="role-base">Clone from standard role</FormLabel>
              <select
                id="role-base"
                className="input-field w-full"
                value={roleBase}
                onChange={(e) => setRoleBase(e.target.value)}
              >
                {["sales", "support", "finance", "admin", "viewer"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <PermissionTree value={rolePerms} onChange={setRolePerms} />
            <Button type="submit" size="sm">
              Create role
            </Button>
          </form>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-heading">Existing custom roles</h4>
            {roles.length === 0 ? (
              <p className="text-sm text-body-muted">No custom roles yet.</p>
            ) : (
              <ul className="space-y-2">
                {roles.map((role) => (
                  <li
                    key={role.id}
                    className="border border-[var(--card-border)] rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-heading">{role.name}</p>
                        <p className="text-xs text-body-muted">
                          Based on {role.base_role} · {role.grants.length} grants
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingRoleId(role.id);
                          setRolePerms(grantsToRecord(role.grants));
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                    {editingRoleId === role.id && (
                      <div className="mt-3 space-y-2">
                        <PermissionTree value={rolePerms} onChange={setRolePerms} />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => void saveRoleGrants()}>
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRoleId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "sets" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={(e) => void createSet(e)} className="space-y-3">
            <h4 className="text-sm font-semibold text-heading">New permission set</h4>
            <div>
              <FormLabel htmlFor="set-name">Name</FormLabel>
              <input
                id="set-name"
                className="input-field w-full"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                required
              />
            </div>
            <PermissionTree value={setPerms} onChange={setSetPerms} />
            <Button type="submit" size="sm">
              Create permission set
            </Button>
          </form>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-heading">Existing permission sets</h4>
            {sets.length === 0 ? (
              <p className="text-sm text-body-muted">No permission sets yet.</p>
            ) : (
              <ul className="space-y-2">
                {sets.map((set) => (
                  <li
                    key={set.id}
                    className="border border-[var(--card-border)] rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-heading">{set.name}</p>
                        <p className="text-xs text-body-muted">
                          {set.grants.length} grants
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSetId(set.id);
                          setSetPerms(grantsToRecord(set.grants));
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                    {editingSetId === set.id && (
                      <div className="mt-3 space-y-2">
                        <PermissionTree value={setPerms} onChange={setSetPerms} />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => void saveSetGrants()}>
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSetId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
