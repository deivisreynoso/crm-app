import { createServerSideClient } from "@/lib/supabase";

export type TeamRole = "owner" | "sales" | "viewer";

export type WorkspaceContext = {
  /** Authenticated user */
  actorUserId: string;
  /** CRM data tenant — owner's user id */
  workspaceOwnerId: string;
  role: TeamRole;
  isWorkspaceOwner: boolean;
};

export async function resolveWorkspaceContext(
  actorUserId: string
): Promise<WorkspaceContext> {
  const supabase = createServerSideClient();

  const { data: membership } = await supabase
    .from("team_members")
    .select("owner_user_id, role")
    .eq("member_user_id", actorUserId)
    .limit(1)
    .maybeSingle();

  if (membership?.owner_user_id) {
    const memberRole = membership.role === "viewer" ? "viewer" : "sales";
    return {
      actorUserId,
      workspaceOwnerId: membership.owner_user_id,
      role: memberRole,
      isWorkspaceOwner: false,
    };
  }

  return {
    actorUserId,
    workspaceOwnerId: actorUserId,
    role: "owner",
    isWorkspaceOwner: true,
  };
}

export function canWriteWorkspace(role: TeamRole): boolean {
  return role === "owner" || role === "sales";
}

export async function getWorkspaceWebsiteLeadsConfig(workspaceOwnerId: string) {
  const supabase = createServerSideClient();

  const envOwner = process.env.WEBSITE_LEADS_USER_ID?.trim();
  const ownerId = envOwner || workspaceOwnerId;

  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_sales_assignee")
    .eq("user_id", ownerId)
    .maybeSingle();

  return {
    workspaceOwnerId: ownerId,
    defaultSalesAssignee: (settings?.default_sales_assignee as string | null) ?? null,
  };
}
