import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";

/** Starts Google Calendar OAuth (configure env vars to enable). */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI.",
      },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
