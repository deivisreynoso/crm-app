import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { seedReviewRequestTemplate } from "@/lib/reviews/seed-review-template";
import { isCrmLocale, type CrmLocale } from "@/lib/crm/i18n";

export async function POST(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    let locale: CrmLocale = "en";
    try {
      const body = await req.json();
      if (body?.locale && isCrmLocale(body.locale)) {
        locale = body.locale;
      }
    } catch {
      // default locale
    }

    const supabase = createServerSideClient();
    const templateId = await seedReviewRequestTemplate(
      supabase,
      workspaceOwnerId!,
      locale
    );

    return NextResponse.json({ template_id: templateId });
  } catch (err) {
    console.error("POST /api/settings/review-request/seed:", err);
    return NextResponse.json(
      { error: "Failed to create review template" },
      { status: 500 }
    );
  }
}
