/** Normalize comma-separated emails for Gmail headers. */
export function normalizeRecipientList(value: string | undefined | null): string {
  if (!value?.trim()) return "";
  const parts = value
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join(", ");
}

export function parseRecipientList(value: string | undefined | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
}
