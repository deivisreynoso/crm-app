import { checkRateLimit } from "@/lib/api/rate-limit";

const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export type CidAccessResult =
  | { allowed: true }
  | { allowed: false; reason: string; retryAfterSec?: number };

/** Brute-force protection for public CID validation (per IP + CID). */
export function validateCidAccess(customerId: string, ip: string): CidAccessResult {
  const key = `cid-fail:${ip}:${customerId.toUpperCase()}`;
  const limit = checkRateLimit(key, MAX_FAILURES, FAILURE_WINDOW_MS);
  if (!limit.allowed) {
    return {
      allowed: false,
      reason: "Too many attempts. Please try again later.",
      retryAfterSec: limit.retryAfterSec,
    };
  }
  return { allowed: true };
}

export function recordCidFailure(customerId: string, ip: string): void {
  const key = `cid-fail:${ip}:${customerId.toUpperCase()}`;
  checkRateLimit(key, MAX_FAILURES, FAILURE_WINDOW_MS);
}
