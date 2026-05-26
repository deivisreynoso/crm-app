import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { formatValidationDetails, humanizeDbError } from "@/lib/validation-errors";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().or(z.literal("")),
  unit_price: z.coerce.number().nonnegative().optional(),
  currency: z.string().optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: formatValidationDetails(parsed.error.flatten()) || "Invalid input",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const d = parsed.data;
    if (d.name !== undefined) updates.name = d.name.trim();
    if (d.description !== undefined) {
      updates.description = d.description?.trim() || null;
    }
    if (d.unit_price !== undefined) updates.unit_price = d.unit_price;
    if (d.currency !== undefined) updates.currency = d.currency;
    if (d.active !== undefined) updates.active = d.active;

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("quote_services")
      .update(updates)
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH quote-service:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;
    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("quote_services")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE quote-service:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
