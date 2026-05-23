/** Pull bare address from `Name <user@domain.com>` or `user@domain.com`. */
export function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const angle = trimmed.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim().toLowerCase();

  const emailOnly = trimmed.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return emailOnly?.[0]?.toLowerCase() ?? trimmed.toLowerCase();
}

export function headerInvolvesAddress(
  headerValue: string,
  address: string
): boolean {
  const target = extractEmailAddress(address);
  if (!target) return false;

  return parseAddressList(headerValue).includes(target);
}

/** All bare addresses in a To/Cc header. */
export function parseAddressList(headerValue: string): string[] {
  if (!headerValue.trim()) return [];

  const addresses: string[] = [];
  for (const part of headerValue.split(",")) {
    const bare = extractEmailAddress(part);
    if (bare) addresses.push(bare);
  }
  return addresses;
}
