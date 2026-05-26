import type { CrmDocument } from "@/types";

export const QUOTE_DOCUMENT_TYPES = ["estimate", "proposal", "contract"] as const;
export type QuoteDocumentType = (typeof QUOTE_DOCUMENT_TYPES)[number];

export function isQuoteDocument(
  type: CrmDocument["type"] | string | undefined
): type is QuoteDocumentType {
  return QUOTE_DOCUMENT_TYPES.includes(type as QuoteDocumentType);
}
