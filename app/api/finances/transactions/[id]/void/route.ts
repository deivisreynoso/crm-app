import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { voidFinanceTransaction } from "@/lib/finances/transactions";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  void_reason: z.string().min(1).max(500),
});

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "void_reason is required." }, { status: 400 });
    }

    const supabase = createServerSideClient();
    await voidFinanceTransaction(
      supabase,
      workspaceOwnerId!,
      id,
      userId!,
      parsed.data.void_reason
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Void failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
