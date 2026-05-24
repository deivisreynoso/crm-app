import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { pipelineSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data, error: dbError } = await supabase
      .from("pipelines")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/pipelines/[id] error:", err);
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
    const parsed = pipelineSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("pipelines")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/pipelines/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update pipeline" },
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

    const { count } = await supabase
      .from("pipelines")
      .select("*", { count: "exact", head: true })
      .eq("user_id", workspaceOwnerId!);

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "You must keep at least one pipeline. Create another pipeline before deleting this one." },
        { status: 400 }
      );
    }

    const { count: oppCount } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("pipeline_id", id)
      .eq("user_id", workspaceOwnerId!);

    if ((oppCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `This pipeline has ${oppCount} opportunit${oppCount === 1 ? "y" : "ies"}. Move or delete them before removing the pipeline.`,
        },
        { status: 400 }
      );
    }

    const { data, error: dbError } = await supabase
      .from("pipelines")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/pipelines/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete pipeline" },
      { status: 500 }
    );
  }
}
