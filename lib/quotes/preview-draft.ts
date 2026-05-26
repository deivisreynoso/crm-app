import type { QuoteLineItem } from "@/types";

/** Live quote builder state mirrored into the right-hand preview. */
export type QuoteLineItemsDraft = {
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
};
