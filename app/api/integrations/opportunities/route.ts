import { NextRequest, NextResponse } from "next/server";
import { requireIntegrationApiAuth } from "@/lib/api/integration-auth";
import {
  createOpportunityForIntegration,
  listOpportunitiesForIntegration,
} from "@/lib/integrations/opportunity-api";
import { createServerSideClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = requireIntegrationApiAuth(req);
  if (auth.error) return auth.error;

  try {
    const params = new URL(req.url).searchParams;
    const result = await listOpportunitiesForIntegration(auth.workspaceOwnerId, {
      pipelineId: params.get("pipeline_id") ?? undefined,
      contactId: params.get("contact_id") ?? undefined,
      stage: params.get("stage") ?? undefined,
      search: params.get("search") ?? undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error("GET /api/integrations/opportunities:", err);
    return NextResponse.json(
      { error: "Failed to list opportunities" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireIntegrationApiAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const supabase = createServerSideClient();
    const result = await createOpportunityForIntegration(
      supabase,
      auth.workspaceOwnerId,
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
    return NextResponse.json(result.data, { status: 201 });
  } catch (err) {
    console.error("POST /api/integrations/opportunities:", err);
    return NextResponse.json(
      { error: "Failed to create opportunity" },
      { status: 500 }
    );
  }
}
