"use client";

import type { CrmDictionary } from "@/lib/crm/i18n";
import type { CrmDocument, QuoteLineItem } from "@/types";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { formatQuoteDate } from "@/lib/crm/format-date";
import { formatCurrency } from "@/lib/utils";

export function QuotePreview({
  doc,
  contact,
  company,
  currency = "USD",
  logoUrl,
  companyDisplayName,
  labels,
}: {
  doc: CrmDocument;
  contact?: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  company?: { name: string } | null;
  currency?: string;
  logoUrl?: string | null;
  companyDisplayName?: string | null;
  labels: CrmDictionary["quotes"];
}) {
  const { locale } = useCrmLocale();
  const lines = (doc.line_items ?? []) as QuoteLineItem[];
  const subtotal =
    Number(doc.subtotal) ||
    lines.reduce((s, l) => s + Number(l.line_total || 0), 0);
  const taxRate = Number(doc.tax_rate) || 0;
  const taxAmount = Number(doc.tax_amount) || 0;
  const total = Number(doc.total_amount) || subtotal + taxAmount;
  const ref = doc.quote_reference?.trim() || "—";
  const brandName =
    companyDisplayName?.trim() || company?.name || "—";

  return (
    <div className="bg-white shadow-[var(--shadow-md)] rounded-lg border border-[var(--card-border)] p-10 min-h-[720px]">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={brandName}
              className="object-contain max-h-[120px] max-w-[400px] h-auto w-auto"
            />
          ) : (
            <div className="text-xl font-bold text-slate-900">{brandName}</div>
          )}
          {!logoUrl && company?.name && (
            <div className="text-xs text-slate-500 mt-1">{company.name}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-semibold tracking-wide text-slate-500">
            {labels.estimate}
          </div>
          <div className="text-sm font-semibold text-slate-900 mt-0.5">
            {doc.title}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {labels.ref}: {ref}
          </div>
          {doc.valid_until && (
            <div className="text-xs text-slate-500 mt-1">
              {labels.validUntil}: {formatQuoteDate(doc.valid_until, locale)}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-8">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {labels.billTo}
          </div>
          <div className="text-sm font-medium text-slate-900 mt-1">
            {contact ? `${contact.first_name} ${contact.last_name}` : "—"}
          </div>
          {(contact?.email || contact?.phone) && (
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              {contact.email && <div>{contact.email}</div>}
              {contact.phone && <div>{contact.phone}</div>}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {labels.total}
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(total, currency)}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-200">
              <th className="text-left py-2 font-medium">{labels.item}</th>
              <th className="text-right py-2 font-medium">{labels.qty}</th>
              <th className="text-right py-2 font-medium">{labels.unit}</th>
              <th className="text-right py-2 font-medium">{labels.lineTotal}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.length === 0 ? (
              <tr>
                <td className="py-6 text-slate-500 text-sm" colSpan={4}>
                  {labels.noLineItems}
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 pr-3 text-slate-900">{l.description}</td>
                  <td className="py-3 text-right text-slate-700">
                    {Number(l.quantity)}
                  </td>
                  <td className="py-3 text-right text-slate-700">
                    {formatCurrency(Number(l.unit_price) || 0, currency)}
                  </td>
                  <td className="py-3 text-right text-slate-900">
                    {formatCurrency(Number(l.line_total) || 0, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex justify-end mt-6">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between text-slate-700">
              <span>{labels.subtotal}</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>
                  {labels.tax} ({taxRate}%)
                </span>
                <span>{formatCurrency(taxAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t border-slate-200">
              <span>{labels.total}</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {doc.content?.trim() && (
        <div className="mt-8">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {labels.notes}
          </div>
          <div className="text-sm text-slate-800 mt-2 whitespace-pre-wrap">
            {doc.content}
          </div>
        </div>
      )}

      {doc.footer_html?.trim() && (
        <div
          className="mt-6 text-xs text-slate-600 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: doc.footer_html }}
        />
      )}
    </div>
  );
}
