import { NextRequest, NextResponse } from "next/server";
import { requireIntegrationApiAuth } from "@/lib/api/integration-auth";
import { patchContactForIntegration } from "@/lib/integrations/patch-contact";
import { createServerSideClient } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = requireIntegrationApiAuth(req);
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const supabase = createServerSideClient();
    const result = await patchContactForIntegration(
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
          ...(result.hint ? { hint: result.hint } : {}),
        },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    console.error("PATCH /api/integrations/contacts/[id]:", err);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}
