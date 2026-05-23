/** Canonical identity keys for duplicate detection (CRM industry practice). */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function canonicalEmail(email?: string | null): string | null {
  const raw = email?.trim().toLowerCase() ?? "";
  if (!raw) return null;
  if (!EMAIL_PATTERN.test(raw)) return null;
  return raw;
}

/**
 * Normalize phone to comparable digits (NANP: last 10 when country code 1 present).
 * Matches records like +1 3217047500 and (321) 704-7500.
 */
export function canonicalPhone(phone?: string | null): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) return null;

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length > 11) {
    return digits;
  }

  return null;
}

export function isValidEmail(email?: string | null): boolean {
  if (!email?.trim()) return true;
  return canonicalEmail(email) !== null;
}

export function isValidPhone(phone?: string | null): boolean {
  if (!phone?.trim()) return true;
  const canonical = canonicalPhone(phone);
  return canonical !== null && canonical.length >= 10;
}
