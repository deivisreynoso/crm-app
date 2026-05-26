import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import {
  opportunitySchema,
  moveOpportunityStageSchema,
} from "@/lib/validators";
import {
  assertParentsInWorkspace,
  workspaceParentForbidden,
} from "@/lib/api/assert-workspace-parents";
import { buildOpportunityUpdate } from "@/lib/opportunity-payload";
import { attachContactToOpportunity } from "@/lib/opportunity-queries";
import { triggerN8NWebhook } from "@/lib/n8n";

type RouteContext = { params: Promise<{ id: string }> };

function isStageOnlyUpdate(body: Record<string, unknown>) {
  const keys = Object.keys(body);
  return keys.length === 1 && keys[0] === "stage";
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
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
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();

    let updates: Record<string, unknown>;

    if (isStageOnlyUpdate(body)) {
      const parsed = moveOpportunityStageSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed" }, { status: 400 });
      }
      updates = { stage: parsed.data.stage };
    } else {
      const parsed = opportunitySchema.partial().safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      updates = buildOpportunityUpdate(parsed.data);
    }

    const supabase = createServerSideClient();
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

    let enriched = data;
    try {
      enriched = await attachContactToOpportunity(data);
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
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
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
