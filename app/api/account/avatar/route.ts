import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import {
  PROFILE_AVATAR_ACCEPT,
  resolveProfileAvatarUrl,
  uploadProfileAvatar,
} from "@/lib/storage/profile-avatar";
import { DOCUMENTS_BUCKET } from "@/lib/storage/documents";
import { humanizeDbError } from "@/lib/validation-errors";
import { ensureUserProfile } from "@/lib/users/ensure-user-profile";

export async function POST(req: NextRequest) {
  try {
    const { userId, session, error } = await requireAuth();
    if (error) return error;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const email = session!.user?.email?.trim();
    if (!email) {
      return NextResponse.json(
        { error: "Your account email is required before uploading a photo." },
        { status: 400 }
      );
    }

    await ensureUserProfile(supabase, {
      userId: userId!,
      email,
      displayName: session!.user?.name,
    });

    const storagePath = await uploadProfileAvatar(supabase, userId!, file);

    const { error: dbError } = await supabase
      .from("user_profiles")
      .update({
        avatar_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId!);

    if (dbError) {
      return NextResponse.json(
        { error: humanizeDbError(dbError.message) },
        { status: 500 }
      );
    }

    const avatar_url = await resolveProfileAvatarUrl(supabase, storagePath);
    return NextResponse.json({
      avatar_storage_path: storagePath,
      avatar_url,
      accept: PROFILE_AVATAR_ACCEPT,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const supabase = createServerSideClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("avatar_storage_path")
      .eq("id", userId!)
      .maybeSingle();

    if (profile?.avatar_storage_path) {
      await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([profile.avatar_storage_path]);
    }

    await supabase
      .from("user_profiles")
      .update({
        avatar_storage_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId!);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/account/avatar:", err);
    return NextResponse.json({ error: "Failed to remove photo" }, { status: 500 });
  }
}
