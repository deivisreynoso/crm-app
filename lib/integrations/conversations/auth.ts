import { NextRequest, NextResponse } from "next/server";

export type ConversationIntegrationAuth = {
  workspaceOwnerId: string;
  error: null;
};

/** Shared secret sent by N8N "CRM API" header auth or x-n8n-secret. */
function getIntegrationSecretHeader(req: NextRequest): string | null {
  return (
    req.headers.get("x-website-secret")?.trim() ||
    req.headers.get("x-n8n-secret")?.trim() ||
    null
  );
}

function isValidIntegrationSecret(header: string | null): boolean {
  if (!header) return false;
  const allowed = [
    process.env.WEBSITE_LEADS_API_SECRET,
    process.env.N8N_CRM_WEBHOOK_SECRET,
    process.env.N8N_WEBHOOK_SECRET,
  ]
    .map((s) => s?.trim())
    .filter(Boolean) as string[];
  return allowed.some((secret) => secret === header);
}

/** Auth for N8N conversation sync endpoints. */
export function requireConversationIntegrationAuth(req: NextRequest):
  | ConversationIntegrationAuth
  | { workspaceOwnerId: null; error: NextResponse } {
  const header = getIntegrationSecretHeader(req);

  if (!isValidIntegrationSecret(header)) {
    const hasAnySecret = Boolean(
      process.env.WEBSITE_LEADS_API_SECRET?.trim() ||
        process.env.N8N_CRM_WEBHOOK_SECRET?.trim() ||
        process.env.N8N_WEBHOOK_SECRET?.trim()
    );
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
