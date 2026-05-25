import { NextRequest, NextResponse } from "next/server";
import { requireWebsiteLeadAuth } from "@/lib/website/lead-api-auth";

export type IntegrationAuthContext = {
  workspaceOwnerId: string;
  error: null;
};

/**
 * Auth for external CRM integrations (N8N, WhatsApp bots, etc.).
 * Uses the same secret as the Lead API plus WEBSITE_LEADS_USER_ID as tenant.
 */
export function requireIntegrationApiAuth(req: NextRequest):
  | IntegrationAuthContext
  | { workspaceOwnerId: null; error: NextResponse } {
  const secret = requireWebsiteLeadAuth(req);
  if (secret.error) {
    return { workspaceOwnerId: null, error: secret.error };
  }

  const workspaceOwnerId = process.env.WEBSITE_LEADS_USER_ID?.trim();
  if (!workspaceOwnerId) {
    return {
      workspaceOwnerId: null,
      error: NextResponse.json(
        {
          error:
            "Integration API is not configured. Set WEBSITE_LEADS_USER_ID on the server.",
        },
        { status: 503 }
      ),
    };
  }

  return { workspaceOwnerId, error: null };
}
