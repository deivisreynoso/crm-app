import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamRole } from "@/lib/team/workspace";
import {
  canViewAllContacts,
  canViewAllOpportunities,
  isPrivilegedRole,
} from "@/lib/auth/permissions";

/** Sales sees tickets assigned to them or unassigned queue items. */
export function applyTicketScope<Q>(
  query: Q,
  role: TeamRole,
  isWorkspaceOwner: boolean,
  actorUserId: string
): Q {
  if (isPrivilegedRole(role, isWorkspaceOwner) || role === "support") {
    return query;
  }
  if (role === "sales") {
    const q = query as Q & { or: (filters: string) => Q };
    return q.or(`assigned_to.eq.${actorUserId},assigned_to.is.null`);
  }
  return query;
}

/** Apply sales ownership filter on contacts (assigned_to). */
export function applyContactScope<Q>(query: Q, role: TeamRole, isWorkspaceOwner: boolean, actorUserId: string): Q {
  if (canViewAllContacts(role, isWorkspaceOwner)) return query;
  if (role === "sales") {
    const q = query as Q & { or: (filters: string) => Q };
    return q.or(`assigned_to.eq.${actorUserId},assigned_to.is.null`);
  }
  return query;
}

/** Apply sales ownership filter on opportunities (owner_id). */
export function applyOpportunityScope<Q>(
  query: Q,
  role: TeamRole,
  isWorkspaceOwner: boolean,
  actorUserId: string
): Q {
  if (canViewAllOpportunities(role, isWorkspaceOwner)) return query;
  if (role === "sales") {
    const q = query as Q & { or: (filters: string) => Q };
    return q.or(`owner_id.eq.${actorUserId},owner_id.is.null`);
  }
  return query;
}

export async function opportunityVisibleToActor(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  opportunityId: string,
  role: TeamRole,
  isWorkspaceOwner: boolean,
  actorUserId: string
): Promise<boolean> {
  if (canViewAllOpportunities(role, isWorkspaceOwner)) return true;

  const { data } = await supabase
    .from("opportunities")
    .select("owner_id")
    .eq("id", opportunityId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!data) return false;
  if (role === "sales") {
    const ownerId = data.owner_id as string | null;
    return !ownerId || ownerId === actorUserId;
  }
  return true;
}

export async function contactVisibleToActor(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  contactId: string,
  role: TeamRole,
  isWorkspaceOwner: boolean,
  actorUserId: string
): Promise<boolean> {
  if (canViewAllContacts(role, isWorkspaceOwner)) return true;

  const { data } = await supabase
    .from("contacts")
    .select("assigned_to")
    .eq("id", contactId)
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  if (!data) return false;
  if (role === "sales") {
    const assigned = data.assigned_to as string | null;
    return !assigned || assigned === actorUserId;
  }
  return true;
}

/** Sales sees calendar events assigned to them (or unassigned queue). */
export function applyCalendarScope<Q>(
  query: Q,
  role: TeamRole,
  isWorkspaceOwner: boolean,
  actorUserId: string
): Q {
  if (isPrivilegedRole(role, isWorkspaceOwner) || role === "support" || role === "finance") {
    return query;
  }
  if (role === "sales") {
    const q = query as Q & { or: (filters: string) => Q };
    return q.or(`assigned_to.eq.${actorUserId},assigned_to.is.null`);
  }
  return query;
}

/** Filter documents/quotes to sales-visible parents (opportunity or contact). */
export async function applyDocumentScopeAsync<Q extends { or: (filters: string) => Q }>(
  supabase: SupabaseClient,
  query: Q,
  workspaceOwnerId: string,
  role: TeamRole,
  isWorkspaceOwner: boolean,
  actorUserId: string
): Promise<Q> {
  if (isPrivilegedRole(role, isWorkspaceOwner) || role === "finance" || role === "support") {
    return query;
  }
  if (role !== "sales") return query;

  const [{ data: opps }, { data: contacts }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id")
      .eq("user_id", workspaceOwnerId)
      .or(`owner_id.eq.${actorUserId},owner_id.is.null`),
    supabase
      .from("contacts")
      .select("id")
      .eq("user_id", workspaceOwnerId)
      .or(`assigned_to.eq.${actorUserId},assigned_to.is.null`),
  ]);

  const oppIds = (opps ?? []).map((o) => o.id as string);
  const contactIds = (contacts ?? []).map((c) => c.id as string);

  const filters: string[] = ["and(contact_id.is.null,opportunity_id.is.null)"];
  if (oppIds.length > 0) {
    filters.push(`opportunity_id.in.(${oppIds.join(",")})`);
  }
  if (contactIds.length > 0) {
    filters.push(`contact_id.in.(${contactIds.join(",")})`);
  }

  return query.or(filters.join(","));
}
