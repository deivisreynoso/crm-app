import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIpFromRequest } from "@/lib/api/rate-limit";
import {
  formSchema,
  processFormSubmission,
} from "@/lib/leads/form-submission-handler";
import { isSameOriginRequest } from "@/lib/website/same-origin";

/** Public marketing-site proxy — adds server-side secret when calling lead ingestion. */
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = clientIpFromRequest(req);
  const limit = checkRateLimit(`website-form:${ip}`, 20, 3_600_000);
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

  let requestLang: "es" | "en" = "es";

  try {
    const body = await req.json();
    requestLang = body.language === "en" ? "en" : "es";
    const parsed = formSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await processFormSubmission(parsed.data, requestLang);
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error("POST /api/website/form-submission:", err);
    const raw =
      err instanceof Error ? err.message : "Failed to process form submission";

    if (raw.toLowerCase().includes("unique") && raw.toLowerCase().includes("email")) {
      return NextResponse.json(
        {
          error:
            requestLang === "es"
              ? "Ya tenemos tu correo registrado. Intenta de nuevo en un momento o escríbenos por el chat."
              : "We already have your email on file. Please try again shortly or reach us via chat.",
          code: "duplicate_email",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: raw }, { status: 500 });
  }
}
