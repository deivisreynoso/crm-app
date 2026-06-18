/**
 * Single-organization deployment: all CRM rows use this Supabase user UUID as `user_id`.
 * Prefer CLICKIN360_ORG_USER_ID; WEBSITE_LEADS_USER_ID is supported during env migration.
 */
export function getClickIn360OrgUserId(): string {
  const id = getClickIn360OrgUserIdOptional();
  if (!id) {
    throw new Error(
      "CLICKIN360_ORG_USER_ID is not configured. Set it to the organization owner user id."
    );
  }
  return id;
}

export function getClickIn360OrgUserIdOptional(): string | null {
  return (
    process.env.CLICKIN360_ORG_USER_ID?.trim() ||
    process.env.WEBSITE_LEADS_USER_ID?.trim() ||
    null
  );
}
