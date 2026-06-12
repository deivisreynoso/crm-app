import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { ensureFinanceCategories } from "@/lib/finances/categories";
import { humanizeDbError } from "@/lib/validation-errors";

const createSchema = z.object({
  kind: z.enum(["income", "expense"]),
  label: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/).optional(),
});

export async function GET() {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const supabase = createServerSideClient();
    await ensureFinanceCategories(supabase, workspaceOwnerId!);

    const { data, error: dbError } = await supabase
      .from("finance_categories")
      .select("*")
      .eq("user_id", workspaceOwnerId!)
      .order("kind")
      .order("sort_order");

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("GET finance categories:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const slug =
      parsed.data.slug ??
      parsed.data.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("finance_categories")
      .insert({
        user_id: workspaceOwnerId!,
        kind: parsed.data.kind,
        slug,
        label: parsed.data.label,
        is_system: false,
        sort_order: 100,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("POST finance category:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
