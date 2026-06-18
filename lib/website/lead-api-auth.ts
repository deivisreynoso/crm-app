import { NextRequest, NextResponse } from "next/server";
import { secretsMatch } from "@/lib/integrations/secret-compare";

/** Shared secret for website / N8N → CRM lead endpoints. */
export function requireWebsiteLeadAuth(req: NextRequest) {
  const secret = process.env.WEBSITE_LEADS_API_SECRET?.trim();
  if (!secret) {
    return {
      error: NextResponse.json(
        {
          error:
            "Lead API is not configured. Set WEBSITE_LEADS_API_SECRET on the server.",
        },
        { status: 503 }
      ),
    };
  }

  const header = req.headers.get("x-website-secret");
  if (!header || !secretsMatch(header, secret)) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { error: null };
}
