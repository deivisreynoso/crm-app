import type { QuoteLineItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

export function formatQuoteLineItemsHtml(
  lines: QuoteLineItem[],
  totals: {
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;
    currency?: string;
  }
): string {
  if (lines.length === 0) return "";

  const currency = totals.currency ?? "USD";
  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${escapeHtml(l.description)}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${l.quantity}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(l.unit_price, currency)}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(l.line_total, currency)}</td></tr>`
    )
    .join("");

  return (
    `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">` +
    `<thead><tr style="background:#f3f4f6">` +
    `<th style="padding:8px;text-align:left">Description</th>` +
    `<th style="padding:8px;text-align:right">Qty</th>` +
    `<th style="padding:8px;text-align:right">Unit</th>` +
    `<th style="padding:8px;text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>` +
    `<p style="text-align:right;margin:4px 0">Subtotal: ${formatCurrency(totals.subtotal, currency)}</p>` +
    (totals.tax_rate > 0
      ? `<p style="text-align:right;margin:4px 0">Tax (${totals.tax_rate}%): ${formatCurrency(totals.tax_amount, currency)}</p>`
      : "") +
    `<p style="text-align:right;font-weight:600;margin:8px 0">Total: ${formatCurrency(totals.total_amount, currency)}</p>`
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
