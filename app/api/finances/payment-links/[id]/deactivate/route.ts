import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { deactivateStripePaymentLink } from "@/lib/integrations/stripe/payment-link";
import { humanizeDbError } from "@/lib/validation-errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id } = await context.params;
    const supabase = createServerSideClient();
    const { data: link } = await supabase
      .from("payment_links")
      .select("*")
      .eq("id", id)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!link) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }
    if (link.status !== "active") {
      return NextResponse.json({ error: "Only active links can be deactivated." }, { status: 400 });
    }

    if (link.stripe_payment_link_id) {
      await deactivateStripePaymentLink(link.stripe_payment_link_id as string);
    }

    const now = new Date().toISOString();
    const { data, error: dbError } = await supabase
      .from("payment_links")
      .update({
        status: "deactivated",
        deactivated_at: now,
        deactivated_by: userId,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: humanizeDbError(dbError.message) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("POST deactivate payment link:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
