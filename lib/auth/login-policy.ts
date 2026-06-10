import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveWorkspaceContext, type TeamRole } from "@/lib/team/workspace";

export const WORKSPACE_EMAIL_DOMAIN = "clickin360.com";

export type LoginMethod = "google" | "credentials";

export function isWorkspaceGoogleEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${WORKSPACE_EMAIL_DOMAIN}`);
}

export async function resolveUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<TeamRole> {
  const ctx = await resolveWorkspaceContext(userId);
  return ctx.role;
}

/** Owner, admin, and sales may use email/password; viewers use it exclusively. */
export function credentialsLoginAllowed(role: TeamRole): boolean {
  return role === "owner" || role === "admin" || role === "sales" || role === "viewer";
}

/** Google SSO requires a @clickin360.com address. */
export function googleLoginAllowed(email: string | null | undefined): boolean {
  return isWorkspaceGoogleEmail(email);
}

/** Viewers must sign in with email/password, not Google. */
export function googleLoginAllowedForRole(role: TeamRole): boolean {
  return role !== "viewer";
}

export function loginMethodError(
  method: LoginMethod,
  role?: TeamRole
): string {
  if (method === "credentials") {
    if (role === "viewer") {
      return "Invalid email or password.";
    }
    return "Invalid email or password.";
  }
  if (role === "viewer") {
    return "View Only accounts must sign in with email and password below.";
  }
  return "Use your @clickin360.com Google Workspace account, or sign in with email and password.";
}
