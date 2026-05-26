export type QuoteLineInput = {
  quantity: number;
  unit_price: number;
};

export function lineTotal(quantity: number, unitPrice: number): number {
  const q = Number.isFinite(quantity) ? quantity : 0;
  const p = Number.isFinite(unitPrice) ? unitPrice : 0;
  return Math.round(q * p * 100) / 100;
}

export function computeQuoteTotals(
  lines: QuoteLineInput[],
  taxRatePercent: number
): { subtotal: number; tax_amount: number; total_amount: number } {
  const subtotal = lines.reduce(
    (sum, l) => sum + lineTotal(l.quantity, l.unit_price),
    0
  );
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const rate = Number.isFinite(taxRatePercent) ? taxRatePercent : 0;
  const tax_amount = Math.round(roundedSubtotal * (rate / 100) * 100) / 100;
  const total_amount = Math.round((roundedSubtotal + tax_amount) * 100) / 100;
  return { subtotal: roundedSubtotal, tax_amount, total_amount };
}
