/** Constant-time string compare for shared API secrets (Edge + Node). */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i]! ^ b[i]!;
  }
  return mismatch === 0;
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
