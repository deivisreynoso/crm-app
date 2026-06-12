import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSideClient } from "@/lib/supabase";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import {
  createPublicSupportTicket,
  resolveSupportSession,
} from "@/lib/support/public-support";

const bodySchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export async function POST(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  const limit = checkRateLimit(`support-ticket:${ip}`, 5, 60_000);
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

  const sessionToken =
    req.headers.get("x-support-session")?.trim() ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!sessionToken) {
    return NextResponse.json({ error: "Session required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const session = await resolveSupportSession(supabase, sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session expired." }, { status: 401 });
    }

    const result = await createPublicSupportTicket(supabase, session, {
      subject: parsed.data.subject,
      description: parsed.data.description,
      priority: parsed.data.priority ?? "medium",
    });

    if (!result) {
      return NextResponse.json({ error: "Could not create ticket." }, { status: 500 });
    }

    return NextResponse.json(
      {
        reference: result.ticketNumber,
        ticket_id: result.ticketId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/public/support/tickets:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
