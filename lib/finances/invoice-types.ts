export const INVOICE_TYPES = [
  {
    id: "quote",
    label: "From quote",
    description: "Bill an accepted quote — contact and line items are imported automatically.",
    requiresQuote: true,
  },
  {
    id: "services",
    label: "Services",
    description: "One-time services or project work not tied to a quote.",
    requiresQuote: false,
  },
  {
    id: "retainer",
    label: "Retainer",
    description: "Recurring or prepaid retainer billing.",
    requiresQuote: false,
  },
  {
    id: "deposit",
    label: "Deposit",
    description: "Upfront deposit before work begins.",
    requiresQuote: false,
  },
  {
    id: "change_order",
    label: "Change order",
    description: "Additional scope or revisions beyond the original agreement.",
    requiresQuote: false,
  },
  {
    id: "milestone",
    label: "Milestone",
    description: "Partial billing for a project milestone.",
    requiresQuote: false,
  },
] as const;

export type InvoiceTypeId = (typeof INVOICE_TYPES)[number]["id"];
export type InvoiceCollectionMethod = "manual" | "payment_link";

export function invoiceTypeLabel(id: string): string {
  return INVOICE_TYPES.find((t) => t.id === id)?.label ?? id;
}
