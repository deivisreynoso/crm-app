import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";

/** Calendar colors for workspace assignable users (legend + team settings). */
export async function GET() {
  const { workspaceOwnerId, error } = await requireAuth();
  if (error) return error;

  const supabase = createServerSideClient();

  const ids = new Set<string>([workspaceOwnerId!]);
  const { data: team } = await supabase
    .from("team_members")
    .select("member_user_id")
    .eq("owner_user_id", workspaceOwnerId!)
    .not("member_user_id", "is", null);

  for (const row of team ?? []) {
    if (row.member_user_id) ids.add(row.member_user_id as string);
  }

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, calendar_color")
    .in("id", [...ids]);

  return NextResponse.json({ data: profiles ?? [] });
}
