export function computeQuoteExpiresAt(sentAt: Date, expiryDays: number): string {
  const expires = new Date(sentAt);
  expires.setDate(expires.getDate() + Math.max(1, expiryDays));
  return expires.toISOString();
}

export function isQuoteExpired(
  expiresAt: string | null | undefined,
  validUntil: string | null | undefined
): boolean {
  const raw = expiresAt ?? (validUntil ? `${validUntil}T23:59:59.999Z` : null);
  if (!raw) return false;
  return new Date(raw).getTime() < Date.now();
}

export function quoteExpiryStatus(
  expiresAt: string | null | undefined,
  validUntil: string | null | undefined,
  status: string
): "expired" | "expiring_soon" | "active" | null {
  if (["accepted", "rejected", "voided", "draft"].includes(status)) return null;
  const raw = expiresAt ?? (validUntil ? `${validUntil}T23:59:59.999Z` : null);
  if (!raw) return "active";
  const ms = new Date(raw).getTime() - Date.now();
  if (ms < 0) return "expired";
  if (ms < 3 * 24 * 60 * 60 * 1000) return "expiring_soon";
  return "active";
}
