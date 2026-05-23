import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createServerSideClient } from "@/lib/supabase";
import {
  checkGmailReadAccess,
  getGoogleGmailConnectedEmail,
  isGoogleGmailConfigured,
} from "@/lib/google/gmail";
import { getGoogleGmailRedirectUri } from "@/lib/google/oauth-config";

export async function GET(req: Request) {
  try {
    const { userId, error } = await requireAuth();
    if (error) return error;

    const redirectUri = getGoogleGmailRedirectUri(req.url);
    const configured = isGoogleGmailConfigured();

    if (!configured) {
      return NextResponse.json({
        connected: false,
        configured: false,
        redirect_uri: redirectUri,
        email: null,
      });
    }

    const supabase = createServerSideClient();
    const { data, error: dbError } = await supabase
      .from("google_gmail_tokens")
      .select("id, email_address")
      .eq("user_id", userId!)
      .maybeSingle();

    if (dbError) {
      console.error("GET gmail status db error:", dbError.message);
      const needsMigration = /does not exist|relation/i.test(dbError.message);
      return NextResponse.json({
        connected: false,
        configured: true,
        redirect_uri: redirectUri,
        email: null,
        storage_error: needsMigration
          ? "Run migration 018_google_gmail_tokens.sql in Supabase, then connect again."
          : dbError.message,
      });
    }

    const connected = !!data?.id;
    const email =
      data?.email_address?.trim() ||
      (connected ? await getGoogleGmailConnectedEmail(userId!) : null);

    const read_access = connected
      ? await checkGmailReadAccess(userId!)
      : false;

    return NextResponse.json({
      connected,
      configured: true,
      redirect_uri: redirectUri,
      email,
      read_access,
    });
  } catch (err) {
    console.error("GET gmail status:", err);
    return NextResponse.json({
      connected: false,
      configured: false,
      email: null,
    });
  }
}
