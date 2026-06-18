import { describe, expect, test } from "vitest";
import { resolveEffectivePermissions } from "./effective-permissions";

describe("effective-permissions", () => {
  test("owner has all permissions", () => {
    const perms = resolveEffectivePermissions({
      role: "owner",
      isWorkspaceOwner: true,
    });
    expect(perms.check("crm.export")).toBe(true);
    expect(perms.check("finances.delete_invoice")).toBe(true);
  });

  test("permission set deny wins over allow", () => {
    const perms = resolveEffectivePermissions({
      role: "admin",
      isWorkspaceOwner: false,
      permissionSetGrants: [
        { permission_key: "crm.export", effect: "deny" },
      ],
    });
    expect(perms.check("crm.export")).toBe(false);
    expect(perms.check("crm.write")).toBe(true);
  });

  test("sales base cannot export until granted by set", () => {
    const base = resolveEffectivePermissions({
      role: "sales",
      isWorkspaceOwner: false,
    });
    expect(base.check("crm.export")).toBe(false);

    const withSet = resolveEffectivePermissions({
      role: "sales",
      isWorkspaceOwner: false,
      permissionSetGrants: [
        { permission_key: "crm.export", effect: "allow" },
      ],
    });
    expect(withSet.check("crm.export")).toBe(true);
  });
});
