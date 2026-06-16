import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/lib/supabase";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const supabase = createServerSideClient();

    const { data: row } = await supabase
      .from("onboarding_responses")
      .select("id, contact_id, contacts!inner(user_id)")
      .eq("id", id)
      .maybeSingle();

    const contactUserId = (
      row?.contacts as { user_id?: string } | null | undefined
    )?.user_id;

    if (!row || contactUserId !== workspaceOwnerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error: dbError } = await supabase
      .from("onboarding_responses")
      .delete()
      .eq("id", id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/onboarding-responses/[id]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
