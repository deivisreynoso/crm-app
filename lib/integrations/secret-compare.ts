import { timingSafeEqual } from "crypto";

/** Constant-time string compare for shared API secrets. */
export function secretsMatch(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function matchesAnySecret(
  header: string | null | undefined,
  secrets: Array<string | undefined | null>
): boolean {
  const value = header?.trim();
  if (!value) return false;
  const allowed = secrets.map((s) => s?.trim()).filter(Boolean) as string[];
  return allowed.some((secret) => secretsMatch(value, secret));
}
