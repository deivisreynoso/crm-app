import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import {
  QUOTE_LOGO_ACCEPT,
  QUOTE_LOGO_MAX_HEIGHT,
  QUOTE_LOGO_MAX_WIDTH,
  resolveQuoteLogoUrl,
  uploadQuoteLogo,
} from "@/lib/storage/quote-logo";
import { humanizeDbError } from "@/lib/validation-errors";

export async function POST(req: NextRequest) {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const storagePath = await uploadQuoteLogo(supabase, workspaceOwnerId!, file);

    const { error: dbError } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: workspaceOwnerId!,
          quote_logo_storage_path: storagePath,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    const quote_logo_url = await resolveQuoteLogoUrl(supabase, storagePath);
    return NextResponse.json({
      quote_logo_storage_path: storagePath,
      quote_logo_url,
      max_width: QUOTE_LOGO_MAX_WIDTH,
      max_height: QUOTE_LOGO_MAX_HEIGHT,
      accept: QUOTE_LOGO_ACCEPT,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } = await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const supabase = createServerSideClient();
    const { data: settings } = await supabase
      .from("user_settings")
      .select("quote_logo_storage_path")
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    if (settings?.quote_logo_storage_path) {
      await supabase.storage
        .from("crm_documents")
        .remove([settings.quote_logo_storage_path]);
    }

    await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: workspaceOwnerId!,
          quote_logo_storage_path: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE quote-logo:", err);
    return NextResponse.json({ error: "Failed to remove logo" }, { status: 500 });
  }
}
