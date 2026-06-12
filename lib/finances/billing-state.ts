export type BillingStep = 1 | 2 | 3 | 4;

export function isInvoiceFullyPaid(params: {
  total: number;
  amountPaid: number;
  invoiceStatus?: string;
}): boolean {
  const { total, amountPaid, invoiceStatus } = params;
  if (amountPaid <= 0) return false;
  if (total <= 0) return false;
  return amountPaid >= total || invoiceStatus === "paid";
}

export function paymentCollectionLabel(params: {
  total: number;
  amountPaid: number;
  invoiceStatus?: string;
}): string {
  if (isInvoiceFullyPaid(params)) return "Paid in full";
  if (params.amountPaid > 0) return "Partially paid — balance open";
  if (params.invoiceStatus === "partially_paid") return "Partially paid — balance open";
  if (params.total <= 0) return "No amount due";
  if (params.invoiceStatus === "pending") return "Pending payment";
  return params.invoiceStatus ?? "Unpaid";
}

export function deriveBillingStep(params: {
  hasQuote: boolean;
  hasInvoice: boolean;
  quoteAccepted?: boolean;
  invoiceStatus?: string;
  hasActiveLink: boolean;
  amountPaid: number;
  total: number;
}): BillingStep {
  if (
    isInvoiceFullyPaid({
      total: params.total,
      amountPaid: params.amountPaid,
      invoiceStatus: params.invoiceStatus,
    })
  ) {
    return 4;
  }

  if (params.hasInvoice) {
    if (
      params.hasActiveLink ||
      ["pending", "partially_paid", "sent", "viewed", "overdue"].includes(
        params.invoiceStatus ?? ""
      )
    ) {
      return 3;
    }
    return 2;
  }

  if (params.hasQuote && params.quoteAccepted) return 1;
  return 1;
}

export function getBillingStepDefs(hasQuote: boolean) {
  if (hasQuote) {
    return [
      { step: 1 as const, label: "Quote accepted", description: "Ready to invoice" },
      { step: 2 as const, label: "Invoice created", description: "Review and send" },
      { step: 3 as const, label: "Collect payment", description: "Partial or full payments" },
      { step: 4 as const, label: "Paid", description: "Balance collected" },
    ];
  }
  return [
    { step: 1 as const, label: "Invoice created", description: "Draft saved" },
    { step: 2 as const, label: "Send invoice", description: "Deliver to customer" },
    { step: 3 as const, label: "Collect payment", description: "Payment link or manual entry" },
    { step: 4 as const, label: "Paid", description: "Balance collected" },
  ];
}
