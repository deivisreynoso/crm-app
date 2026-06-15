import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import { getSupabaseBrowserConfig } from "@/lib/supabase/config";

const bodySchema = z.object({
  token_hash: z.string().min(16),
});

/** Exchange recovery token_hash for a session (server-side; works cross-device). */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIpFromRequest(req);
    const limit = checkRateLimit(`verify-recovery:${ip}`, 20, 3_600_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: limit.retryAfterSec
            ? { "Retry-After": String(limit.retryAfterSec) }
            : undefined,
        }
      );
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reset link." }, { status: 400 });
    }

    const { url, anonKey } = getSupabaseBrowserConfig("verify-recovery");
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: parsed.data.token_hash,
      type: "recovery",
    });

    if (error || !data.session) {
      const msg = (error?.message ?? "").toLowerCase();
      const code =
        msg.includes("expired") || error?.code === "otp_expired"
          ? "otp_expired"
          : "reset_link_invalid";
      console.error("POST /api/auth/verify-recovery:", error?.message);
      return NextResponse.json({ error: code }, { status: 400 });
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    console.error("POST /api/auth/verify-recovery:", err);
    return NextResponse.json(
      { error: "Could not verify reset link. Please try again." },
      { status: 500 }
    );
  }
}
