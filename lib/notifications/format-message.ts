/** Strip broken template-literal artifacts from stored notification messages. */
export function formatNotificationMessage(message: string | null | undefined): string | null {
  if (!message?.trim()) return null;
  const cleaned = message
    .replace(/:\s*undefined\b/gi, "")
    .replace(/\bundefined\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || null;
}
