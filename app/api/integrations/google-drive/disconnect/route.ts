import { NextResponse } from "next/server";
import { requireAuth, requireWorkspaceManage } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { revokeGoogleToken } from "@/lib/google/revoke-google-token";

export async function DELETE() {
  try {
    const { workspaceOwnerId, role, isWorkspaceOwner, error } =
      await requireAuth();
    if (error) return error;

    const manageError = requireWorkspaceManage(role!, isWorkspaceOwner);
    if (manageError) return manageError;

    const supabase = createServerSideClient();

    const { data: row } = await supabase
      .from("google_drive_tokens")
      .select("refresh_token, access_token")
      .eq("user_id", workspaceOwnerId!)
      .maybeSingle();

    const tokenToRevoke = row?.refresh_token ?? row?.access_token;
    if (tokenToRevoke) {
      await revokeGoogleToken(tokenToRevoke);
    }

    const { error: dbError } = await supabase
      .from("google_drive_tokens")
      .delete()
      .eq("user_id", workspaceOwnerId!);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE google drive disconnect:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
