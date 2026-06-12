import type { TeamRole } from "@/lib/team/workspace";
import { canManageWorkspace, canWriteWorkspace } from "@/lib/team/workspace";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Session-authenticated CRM APIs that skip workspace role checks */
const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/leads/",
  "/api/website/",
  "/api/team/invites/",
  "/api/quotes/public/",
  "/api/integrations/n8n/",
  "/api/public/support/",
  "/api/webhooks/stripe",
];

/** Integration APIs authenticated by shared secret, not session role */
const INTEGRATION_API_PREFIXES = [
  "/api/integrations/contacts/",
  "/api/integrations/accounts/",
  "/api/integrations/tickets/",
  "/api/integrations/opportunities",
];

/** Viewer may update only their own account credentials */
const VIEWER_WRITE_ALLOWLIST = ["/api/account/profile", "/api/account/password"];

export function isApiWriteMethod(method: string) {
  return WRITE_METHODS.has(method.toUpperCase());
}

export function isPublicApiRoute(pathname: string) {
  return (
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p)) ||
    INTEGRATION_API_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

export function isViewerWriteAllowed(pathname: string) {
  return VIEWER_WRITE_ALLOWLIST.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

const WORKSPACE_MANAGE_WRITE_PREFIXES = [
  "/api/settings",
  "/api/custom-fields",
  "/api/document-templates",
  "/api/duplicate-reviews",
];

/** GET routes that require manage role even though they are reads */
const WORKSPACE_MANAGE_READ_PREFIXES = ["/api/audit-logs", "/api/settings/integrations"];

export function requiresWorkspaceManage(pathname: string, method: string) {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD") {
    return WORKSPACE_MANAGE_READ_PREFIXES.some((p) => pathname.startsWith(p));
  }
  if (pathname.startsWith("/api/settings/member")) return false;
  if (pathname.startsWith("/api/settings/quote-logo")) return true;
  if (pathname === "/api/settings" && m === "PATCH") return true;
  if (pathname === "/api/team/members" && m === "POST") return true;
  if (/^\/api\/team\/members\/[^/]+$/.test(pathname) && m === "PATCH") return true;
  if (pathname === "/api/pipelines/seed" && m === "POST") return false;
  if (pathname === "/api/pipelines" && m === "POST") return true;
  if (/^\/api\/pipelines\/[^/]+$/.test(pathname) && m !== "GET") return true;
  /** Catalog CRUD in Settings; quote line items use POST /api/quote-services (write role). */
  if (/^\/api\/quote-services\/[^/]+$/.test(pathname) && m !== "GET") return true;
  if (
    WORKSPACE_MANAGE_WRITE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return true;
  }
  return false;
}

export function requiresWorkspaceOwnerOnly(pathname: string, method: string) {
  const m = method.toUpperCase();
  if (pathname === "/api/account" && m === "DELETE") return true;
  if (/^\/api\/team\/members\/[^/]+$/.test(pathname) && m === "DELETE") return true;
  return false;
}

export function workspaceWriteForbidden(
  role: TeamRole,
  pathname: string,
  method: string
): boolean {
  if (!isApiWriteMethod(method)) return false;
  if (isPublicApiRoute(pathname)) return false;
  if (canWriteWorkspace(role)) return false;
  if (role === "viewer" && isViewerWriteAllowed(pathname)) return false;
  return true;
}

export function workspaceManageForbidden(
  role: TeamRole,
  isWorkspaceOwner: boolean,
  pathname: string,
  method: string
): boolean {
  if (!requiresWorkspaceManage(pathname, method)) return false;
  return !canManageWorkspace(role, isWorkspaceOwner);
}

export function workspaceOwnerOnlyForbidden(
  isWorkspaceOwner: boolean,
  pathname: string,
  method: string
): boolean {
  if (!requiresWorkspaceOwnerOnly(pathname, method)) return false;
  return !isWorkspaceOwner;
}
