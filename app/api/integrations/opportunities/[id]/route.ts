import { NextRequest, NextResponse } from "next/server";
import { requireIntegrationApiAuth } from "@/lib/api/integration-auth";
import { patchOpportunityForIntegration } from "@/lib/integrations/patch-opportunity";
import { createServerSideClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = requireIntegrationApiAuth(req);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const supabase = createServerSideClient();
    const result = await patchOpportunityForIntegration(
      supabase,
      auth.workspaceOwnerId,
      id,
      body
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.details ? { details: result.details } : {}),
        },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("PATCH /api/integrations/opportunities/[id]:", err);
    return NextResponse.json(
      { error: "Failed to update opportunity" },
      { status: 500 }
    );
  }
}
