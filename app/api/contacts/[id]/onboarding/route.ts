import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { recordAuditLog } from "@/lib/audit/record";
import { createServerSideClient } from "@/lib/supabase";
import { startContactOnboarding } from "@/lib/onboarding/start";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId, workspaceOwnerId, role, isWorkspaceOwner, error } =
      await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const { id: contactId } = await context.params;
    const supabase = createServerSideClient();

    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", contactId)
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const tokens = await startContactOnboarding(supabase, workspaceOwnerId!, contactId, {
      actorUserId: userId!,
      manual: true,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    const onboardingUrl = `${appUrl}/onboarding/${tokens.onboarding_token}`;

    await recordAuditLog({
      workspaceOwnerId: workspaceOwnerId!,
      actorUserId: userId!,
      action: "onboarding.started",
      entityType: "contact",
      entityId: contactId,
      changeSummary: "Manual onboarding started",
      req,
    });

    return NextResponse.json({
      success: true,
      onboarding_url: onboardingUrl,
      onboarding_token: tokens.onboarding_token,
      feedback_token: tokens.feedback_token,
    });
  } catch (err) {
    console.error("POST /api/contacts/[id]/onboarding:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
