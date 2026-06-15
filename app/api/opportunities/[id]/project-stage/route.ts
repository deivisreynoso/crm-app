import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceWrite } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { updateProjectStageSchema } from "@/lib/validators";
import { updateOpportunityProjectStage } from "@/lib/project-stages/update-stage";
import { attachContactToOpportunity } from "@/lib/opportunity-queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } =
      await requireAuth();
    if (error) return error;

    const writeError = requireWorkspaceWrite(role!);
    if (writeError) return writeError;

    const { id } = await context.params;
    const parsed = updateProjectStageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const result = await updateOpportunityProjectStage(supabase, {
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      opportunityId: id,
      stage: parsed.data.stage,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    let enriched = result.data;
    try {
      enriched = await attachContactToOpportunity(result.data);
    } catch (enrichErr) {
      console.error("PATCH project-stage enrich error:", enrichErr);
    }

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("PATCH /api/opportunities/[id]/project-stage:", err);
    return NextResponse.json(
      { error: "Failed to update project stage" },
      { status: 500 }
    );
  }
}
