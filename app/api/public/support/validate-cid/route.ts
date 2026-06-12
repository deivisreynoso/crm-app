import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSideClient } from "@/lib/supabase";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import {
  createSupportCidSession,
  isValidCustomerIdFormat,
  normalizeCustomerId,
} from "@/lib/support/public-support";

const bodySchema = z.object({
  customer_id: z.string().min(1).max(32),
  language: z.enum(["en", "es"]).optional(),
});

const GENERIC_ERROR = "Unable to verify customer ID.";

export async function POST(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  const limit = checkRateLimit(`validate-cid:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { valid: false, error: GENERIC_ERROR },
      {
        status: 429,
        headers: limit.retryAfterSec
          ? { "Retry-After": String(limit.retryAfterSec) }
          : undefined,
      }
    );
  }

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ valid: false, error: GENERIC_ERROR }, { status: 400 });
    }

    const customerId = normalizeCustomerId(parsed.data.customer_id);
    if (!isValidCustomerIdFormat(customerId)) {
      return NextResponse.json({ valid: false, error: GENERIC_ERROR }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const language = parsed.data.language === "es" ? "es" : "en";
    const session = await createSupportCidSession(supabase, customerId, language);

    if (!session) {
      return NextResponse.json({ valid: false, error: GENERIC_ERROR }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      session_token: session.token,
    });
  } catch (err) {
    console.error("POST /api/public/support/validate-cid:", err);
    return NextResponse.json({ valid: false, error: GENERIC_ERROR }, { status: 500 });
  }
}
