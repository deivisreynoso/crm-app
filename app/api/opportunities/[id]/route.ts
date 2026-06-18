import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import {
  opportunityPatchSchema,
  moveOpportunityStageSchema,
} from "@/lib/validators";
import {
  assertParentsInWorkspace,
  workspaceParentForbidden,
} from "@/lib/api/assert-workspace-parents";
import { buildOpportunityUpdate } from "@/lib/opportunity-payload";
import { attachContactToOpportunity } from "@/lib/opportunity-queries";
import {
  applyWonProjectStageInit,
  fetchPipelineStages,
} from "@/lib/opportunities/patch-helpers";
import { isLostStageId, isLostStageName } from "@/lib/opportunities/stage-outcome";
import { triggerN8NWebhook } from "@/lib/n8n";

type RouteContext = { params: Promise<{ id: string }> };

function isStageOnlyUpdate(body: Record<string, unknown>) {
  const keys = Object.keys(body);
  return (
    keys.length >= 1 &&
    keys.length <= 3 &&
    keys.every((k) =>
      ["stage", "loss_reason", "loss_reason_notes"].includes(k)
    ) &&
    keys.includes("stage")
  );
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data, error: dbError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(await attachContactToOpportunity(data));
  } catch (err) {
    console.error("GET /api/opportunities/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();

    let updates: Record<string, unknown>;

    if (isStageOnlyUpdate(body)) {
      const parsed = moveOpportunityStageSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed" }, { status: 400 });
      }
      updates = {
        stage: parsed.data.stage,
        ...(parsed.data.loss_reason !== undefined
          ? {
              loss_reason: parsed.data.loss_reason?.trim() || null,
            }
          : {}),
        ...(parsed.data.loss_reason_notes !== undefined
          ? {
              loss_reason_notes: parsed.data.loss_reason_notes?.trim() || null,
            }
          : {}),
      };
    } else {
      const parsed = opportunityPatchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      updates = buildOpportunityUpdate(parsed.data);
    }

    const supabase = createServerSideClient();

    const { data: before } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!before) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    const pipelineStages = await fetchPipelineStages(
      supabase,
      workspaceOwnerId!,
      (before.pipeline_id as string | null)
    );
    const targetStageId = (updates.stage as string | undefined) ?? (before.stage as string);
    const targetStageName =
      (pipelineStages ?? []).find((s) => s.id === targetStageId)?.name ?? "";
    const movingToLost =
      updates.stage !== undefined &&
      (isLostStageId(targetStageId) || isLostStageName(targetStageName));
    if (movingToLost && !((updates.loss_reason as string | null) ?? (before.loss_reason as string | null))) {
      return NextResponse.json(
        { error: "Loss reason is required when closing an opportunity as lost." },
        { status: 400 }
      );
    }

    if (!isStageOnlyUpdate(body)) {
      const parentCheck = await assertParentsInWorkspace(supabase, workspaceOwnerId!, {
        contact_id: updates.contact_id as string | null | undefined,
        company_id: updates.company_id as string | null | undefined,
      });
      const parentError = workspaceParentForbidden(parentCheck);
      if (parentError) return parentError;
    }

    const { data, error: dbError } = await supabase
      .from("opportunities")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select("*")
      .single();

    if (dbError) {
      console.error("PATCH opportunity db error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    const pipelineStagesAfter = await fetchPipelineStages(
      supabase,
      workspaceOwnerId!,
      (data.pipeline_id as string | null) ?? (before.pipeline_id as string | null)
    );

    const withProjectStage = await applyWonProjectStageInit(
      supabase,
      before as Record<string, unknown>,
      data as Record<string, unknown>,
      pipelineStagesAfter
    );

    let enriched = withProjectStage;
    try {
      enriched = await attachContactToOpportunity(withProjectStage);
    } catch (enrichErr) {
      console.error("PATCH opportunity enrich error:", enrichErr);
    }
    await triggerN8NWebhook("opportunity.updated", enriched);

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("PATCH /api/opportunities/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update opportunity" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data, error: dbError } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    await triggerN8NWebhook("opportunity.deleted", data);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/opportunities/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete opportunity" },
      { status: 500 }
    );
  }
}
