import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { pipelineSchema } from "@/lib/validators";

export async function GET() {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("pipelines")
      .select("*")
      .eq("user_id", workspaceOwnerId!)
      .order("created_at", { ascending: true });

    if (dbError) throw dbError;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET /api/pipelines error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = pipelineSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("pipelines")
      .insert([
        {
          user_id: workspaceOwnerId,
          name: parsed.data.name,
          stages: parsed.data.stages,
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/pipelines error:", err);
    return NextResponse.json(
      { error: "Failed to create pipeline" },
      { status: 500 }
    );
  }
}
