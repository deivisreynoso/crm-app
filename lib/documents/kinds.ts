import type { CrmDocument } from "@/types";

/** Legacy rows may still use proposal/contract; new quotes are always estimate. */
export const QUOTE_DOCUMENT_TYPES = ["estimate", "proposal", "contract"] as const;
export type QuoteDocumentType = (typeof QUOTE_DOCUMENT_TYPES)[number];

/** Stored document type for all newly created quotes. */
export const QUOTE_DOCUMENT_CREATE_TYPE = "estimate" as const;

export function isQuoteDocument(
  type: CrmDocument["type"] | string | undefined
): type is QuoteDocumentType {
  return QUOTE_DOCUMENT_TYPES.includes(type as QuoteDocumentType);
}

/** Normalize create/update payloads so only quote documents use the canonical type. */
export function coerceQuoteDocumentType(
  type: string | undefined | null
): string | undefined | null {
  if (type == null) return type;
  if (isQuoteDocument(type)) return QUOTE_DOCUMENT_CREATE_TYPE;
  return type;
}
