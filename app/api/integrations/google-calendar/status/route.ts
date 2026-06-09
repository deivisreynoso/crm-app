import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import { isGoogleCalendarConfigured } from "@/lib/google/calendar";
import { getGoogleOAuthEnvStatus } from "@/lib/google/oauth-config";

/** Calendar OAuth tokens are stored per signed-in user (Workspace account). */
export async function GET(req: Request) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const oauth = getGoogleOAuthEnvStatus(req.url);
    const configured = isGoogleCalendarConfigured();

    if (!configured) {
      return NextResponse.json({
        connected: false,
        configured: false,
        redirect_uri: oauth.redirectUri,
      });
    }

    const supabase = createServerSideClient();
    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("id, expires_at")
      .eq("user_id", userId!)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", userId!)
      .maybeSingle();

    return NextResponse.json({
      connected: !!data?.id,
      configured: true,
      redirect_uri: oauth.redirectUri,
      email: (profile as { email?: string } | null)?.email ?? null,
      per_user: true,
    });
  } catch (err) {
    console.error("GET google-calendar status:", err);
    return NextResponse.json({ connected: false, configured: false });
  }
}
