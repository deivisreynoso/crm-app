import type { NextRequest } from "next/server";

/** Reject cross-site browser calls to same-origin marketing proxies. */
export function isSameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return process.env.NODE_ENV === "development";
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
