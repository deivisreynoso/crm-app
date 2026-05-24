import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { z } from "zod";
import { formatValidationDetails } from "@/lib/validation-errors";

const companySchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  company_size: z.string().optional().or(z.literal("")),
  revenue: z.string().optional().or(z.literal("")),
  account_summary: z.string().optional().or(z.literal("")),
});

function emptyToNull(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/companies/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      const detailStr = formatValidationDetails(parsed.error.flatten());
      return NextResponse.json(
        { error: detailStr || "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.website !== undefined) updates.website = emptyToNull(parsed.data.website);
    if (parsed.data.phone !== undefined) updates.phone = emptyToNull(parsed.data.phone);
    if (parsed.data.industry !== undefined) updates.industry = emptyToNull(parsed.data.industry);
    if (parsed.data.company_size !== undefined) updates.company_size = emptyToNull(parsed.data.company_size);
    if (parsed.data.revenue !== undefined) updates.revenue = emptyToNull(parsed.data.revenue);
    if (parsed.data.account_summary !== undefined) {
      updates.account_summary = emptyToNull(parsed.data.account_summary);
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/companies/[id] error:", err);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { error: dbError } = await supabase
      .from("companies")
      .delete()
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/companies/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
