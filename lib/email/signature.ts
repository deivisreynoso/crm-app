/** Append user HTML signature to outbound email body when not already present. */
export function appendEmailSignature(
  body: string,
  signatureHtml: string | null | undefined
): string {
  const sig = signatureHtml?.trim();
  if (!sig) return body;

  const plainSig = sig.replace(/<[^>]+>/g, "").trim();
  if (plainSig && body.includes(plainSig.slice(0, 40))) {
    return body;
  }

  const separator = body.trim() ? "\n\n--\n" : "";
  return `${body.trim()}${separator}${sig}`;
}
