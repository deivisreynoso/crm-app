import type { TeamRole } from "@/lib/team/workspace";
import { canManageWorkspace } from "@/lib/team/workspace";

/** Settings visible to every authenticated workspace member. */
export const MEMBER_SETTINGS_IDS = [
  "email-templates",
  "review-invitations",
  "booking-availability",
  "integrations-workspace",
] as const;

/** Additional settings for workspace owner or admin. */
export const ADMIN_SETTINGS_IDS = [
  "custom-fields",
  "audit-logs",
  "team",
  "integrations-admin",
  "website-leads",
  "duplicate-contacts",
  "platform-language",
] as const;

export type MemberSettingsId = (typeof MEMBER_SETTINGS_IDS)[number];
export type AdminSettingsId = (typeof ADMIN_SETTINGS_IDS)[number];
export type SettingsSectionId = MemberSettingsId | AdminSettingsId;

export function canAccessSettingsSection(
  sectionId: SettingsSectionId,
  role: TeamRole,
  isWorkspaceOwner: boolean
): boolean {
  if ((MEMBER_SETTINGS_IDS as readonly string[]).includes(sectionId)) {
    return true;
  }
  return canManageWorkspace(role, isWorkspaceOwner);
}

/** API prefixes writable by any workspace member (not viewer for writes — middleware handles that). */
export const MEMBER_SETTINGS_API_PREFIXES = [
  "/api/email-templates",
  "/api/settings/booking",
  "/api/settings/review",
];

/** API prefixes restricted to owner/admin. */
export const ADMIN_SETTINGS_API_PREFIXES = [
  "/api/custom-fields",
  "/api/audit-logs",
  "/api/team/members",
  "/api/settings/integrations",
  "/api/duplicate-reviews",
];

export function settingsApiRequiresManage(pathname: string, method: string): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD") {
    if (pathname.startsWith("/api/audit-logs")) return true;
    if (pathname.startsWith("/api/settings/integrations")) return true;
    return false;
  }

  if (ADMIN_SETTINGS_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return true;
  }

  if (pathname.startsWith("/api/settings") && !pathname.startsWith("/api/settings/booking")) {
    if (pathname.startsWith("/api/settings/review")) return false;
    return true;
  }

  return false;
}
