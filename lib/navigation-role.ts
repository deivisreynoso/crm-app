import type { TeamRole } from "@/lib/team/workspace";
import { canAccessFinances } from "@/lib/auth/permissions";
import type { NavItem } from "@/lib/navigation";

export function isNavItemVisible(
  item: NavItem,
  role: TeamRole | undefined,
  isWorkspaceOwner: boolean,
  canWrite: boolean
): boolean {
  if (item.requiresWrite && !canWrite) return false;

  if (item.href === "/finances" || item.href.startsWith("/finances/")) {
    return canAccessFinances(role ?? "viewer", isWorkspaceOwner);
  }

  if (role === "finance") {
    return item.href === "/account" || item.href.startsWith("/account/");
  }

  return true;
}
