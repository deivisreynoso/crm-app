/** Merge keys that resolve to empty string when unset (optional blocks). */
const OPTIONAL_EMPTY_KEYS = new Set(["user.signature"]);

function splitDisplayName(displayName: string): { firstname: string; lastname: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: "", lastname: "" };
  if (parts.length === 1) return { firstname: parts[0], lastname: "" };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

export function buildQuoteEmailMergeContext(input: {
  contact?: { first_name?: string | null; last_name?: string | null } | null;
  companyName?: string | null;
  acceptUrl?: string | null;
  userDisplayName?: string | null;
  userSignatureHtml?: string | null;
}): Record<string, string | undefined> {
  const first = input.contact?.first_name?.trim() ?? "";
  const last = input.contact?.last_name?.trim() ?? "";
  const contactName = [first, last].filter(Boolean).join(" ");
  const { firstname, lastname } = splitDisplayName(input.userDisplayName ?? "");
  const acceptUrl = input.acceptUrl?.trim() ?? "";

  return {
    "contact.name": contactName,
    contact_name: contactName,
    first_name: first,
    last_name: last,
    "quote.accept_url": acceptUrl,
    quote_accept_url: acceptUrl,
    "user.signature": input.userSignatureHtml?.trim() ?? "",
    "user.firstname": firstname,
    "user.lastname": lastname,
  };
}

export function mergeQuoteEmailContext(
  baseContext: Record<string, string | undefined>,
  quoteContext: Record<string, string | undefined>
): Record<string, string | undefined> {
  return { ...baseContext, ...quoteContext };
}

/** True when the body already includes a signature block from the quote template. */
export function quoteEmailHasSignatureBlock(
  body: string,
  signatureHtml?: string | null
): boolean {
  if (/\{\{\s*user\.signature\s*\}\}/.test(body)) return true;
  if (/data-email-signature="true"/i.test(body)) return true;
  if (/\{\{\s*user\.(firstname|lastname)\s*\}\}/.test(body)) return true;

  const sig = signatureHtml?.trim();
  if (sig) {
    const plainSig = sig.replace(/<[^>]+>/g, "").trim();
    if (plainSig && body.includes(plainSig.slice(0, 40))) return true;
  }

  return false;
}

export function isOptionalEmptyMergeKey(key: string): boolean {
  return OPTIONAL_EMPTY_KEYS.has(key);
}
