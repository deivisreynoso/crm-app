import { matchesAnySecret } from "@/lib/integrations/secret-compare";
import { NextRequest, NextResponse } from "next/server";
import { getClickIn360OrgUserIdOptional } from "@/lib/org/constants";

export type ConversationIntegrationAuth = {
  workspaceOwnerId: string;
  error: null;
};

function getIntegrationSecretHeader(req: NextRequest): string | null {
  return (
    req.headers.get("x-website-secret")?.trim() ||
    req.headers.get("x-n8n-secret")?.trim() ||
    null
  );
}

function integrationSecrets(): string[] {
  return [
    process.env.WEBSITE_LEADS_API_SECRET,
    process.env.N8N_CRM_WEBHOOK_SECRET,
    process.env.N8N_WEBHOOK_SECRET,
  ]
    .map((s) => s?.trim())
    .filter(Boolean) as string[];
}

/** Auth for N8N conversation sync endpoints. */
export function requireConversationIntegrationAuth(req: NextRequest):
  | ConversationIntegrationAuth
  | { workspaceOwnerId: null; error: NextResponse } {
  const header = getIntegrationSecretHeader(req);

  if (!matchesAnySecret(header, integrationSecrets())) {
    const hasAnySecret = integrationSecrets().length > 0;
    if (!hasAnySecret) {
      return {
        workspaceOwnerId: null,
        error: NextResponse.json(
          {
            error:
              "Integration API is not configured. Set WEBSITE_LEADS_API_SECRET (or N8N_CRM_WEBHOOK_SECRET) on the server.",
          },
          { status: 503 }
        ),
      };
    }
    return {
      workspaceOwnerId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const workspaceOwnerId = getClickIn360OrgUserIdOptional();
  if (!workspaceOwnerId) {
    return {
      workspaceOwnerId: null,
      error: NextResponse.json(
        {
          error:
            "Integration API is not configured. Set CLICKIN360_ORG_USER_ID on the server.",
        },
        { status: 503 }
      ),
    };
  }

  return { workspaceOwnerId, error: null };
}
