"use client";

import { useState } from "react";
import axios from "axios";
import { Copy, Link2, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { AddTransactionModal } from "@/components/finances/add-transaction-modal";
import { GeneratePaymentLinkModal } from "@/components/finances/generate-payment-link-modal";
import {
  useFinanceTransactions,
  useVoidFinanceTransaction,
} from "@/hooks/useFinanceTransactions";
import { usePaymentLinks } from "@/hooks/useFinances";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { isInvoiceFullyPaid, paymentCollectionLabel } from "@/lib/finances/billing-state";
import { formatCurrency } from "@/lib/utils";
import type { Invoice } from "@/types";

type Props = {
  invoice: Invoice;
  onUpdated?: () => void;
};

export function InvoicePaymentsPanel({ invoice, onUpdated }: Props) {
  const { canWrite, canManage } = useWorkspaceCapabilities();
  const { data: links = [], refetch: refetchLinks } = usePaymentLinks({
    invoice_id: invoice.id,
  });
  const { data: txs = [], refetch: refetchTxs } = useFinanceTransactions({
    invoice_id: invoice.id,
    type: "income",
  });
  const voidTx = useVoidFinanceTransaction();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const invoiceLinks = links;
  const activeLink = invoiceLinks.find((l) => l.status === "active");
  const manualPayments = txs.filter((t) => t.source === "manual" && t.status === "completed");
  const onlinePayments = txs.filter(
    (t) =>
      (t.source === "stripe_payment_link" || t.source === "stripe_checkout") &&
      t.status === "completed"
  );

  const total = Number(invoice.total);
  const amountPaid = txs
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const balanceDue = Math.max(0, total - amountPaid);
  const pct = total > 0 ? Math.min(100, Math.round((amountPaid / total) * 100)) : 0;
  const fullyPaid = isInvoiceFullyPaid({
    total,
    amountPaid,
    invoiceStatus: invoice.status,
  });
  const canCollect =
    canWrite &&
    !["voided", "paid"].includes(invoice.status) &&
    total > 0 &&
    amountPaid < total;
  const statusLabel = paymentCollectionLabel({
    total,
    amountPaid,
    invoiceStatus: invoice.status,
  });

  function refresh() {
    void refetchLinks();
    void refetchTxs();
    onUpdated?.();
  }

  async function deactivateLink(id: string) {
    await axios.post(`/api/finances/payment-links/${id}/deactivate`);
    refresh();
  }

  async function copyUrl(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <>
      <FormSection
        id="payments"
        title="Payments & collection"
        description="Customers can pay in multiple installments. The invoice stays open until the full balance is collected."
      >
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-body-muted">Balance due</p>
              <p className="text-2xl font-semibold text-heading tabular-nums">
                {formatCurrency(balanceDue, invoice.currency)}
              </p>
              <p className="text-xs text-body-muted mt-1">
                {formatCurrency(amountPaid, invoice.currency)} paid of{" "}
                {formatCurrency(total, invoice.currency)}
              </p>
            </div>
            <Badge variant={fullyPaid ? "success" : amountPaid > 0 ? "warning" : "info"}>
              {statusLabel}
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-border)] overflow-hidden">
            <div
              className="h-full bg-[var(--secondary)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {canCollect && (
          <div className="space-y-2">
            <p className="text-xs text-body-muted">
              Log a partial amount or create a payment link for up to{" "}
              <strong>{formatCurrency(balanceDue, invoice.currency)}</strong> remaining.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => setLinkOpen(true)}>
                <Link2 className="h-4 w-4 mr-1.5" />
                Payment link (partial or full)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
                <Receipt className="h-4 w-4 mr-1.5" />
                Log partial payment
              </Button>
            </div>
          </div>
        )}

        {invoice.status === "draft" && canManage && (
          <p className="text-xs text-body-muted">
            Send the invoice from the billing workflow above before collecting payment.
          </p>
        )}

        <div className="space-y-3 pt-1">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-body-muted mb-2">
              Payment links
            </h4>
            {invoiceLinks.length === 0 ? (
              <p className="text-sm text-body-muted">No payment links yet.</p>
            ) : (
              <ul className="space-y-2">
                {invoiceLinks.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {formatCurrency(Number(link.amount), link.currency)}
                      </span>
                      <Badge variant="info" className="ml-2">
                        {link.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void copyUrl(link.id, link.url)}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        {copiedId === link.id ? "Copied" : "Copy"}
                      </Button>
                      {canManage && link.status === "active" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void deactivateLink(link.id)}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {activeLink && balanceDue > 0 && (
              <p className="text-xs text-body-muted mt-2">
                After a link is paid, create another for the remaining balance ({formatCurrency(balanceDue, invoice.currency)}).
              </p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-body-muted mb-2">
              Payments received
            </h4>
            {txs.filter((t) => t.status === "completed").length === 0 ? (
              <p className="text-sm text-body-muted">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {[...onlinePayments, ...manualPayments].map((tx) => (
                  <li
                    key={tx.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(Number(tx.amount), tx.currency)}
                      </span>
                      <span className="text-body-muted ml-2 capitalize">{tx.source}</span>
                    </div>
                    {canManage && tx.source === "manual" && tx.status === "completed" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const reason = window.prompt("Void reason?");
                          if (reason?.trim()) {
                            void voidTx.mutateAsync({ id: tx.id, void_reason: reason.trim() });
                            refresh();
                          }
                        }}
                      >
                        Void
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </FormSection>

      <AddTransactionModal
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          refresh();
        }}
        defaults={{
          type: "income",
          invoice_id: invoice.id,
          contact_id: invoice.contact_id,
          category_slug: "quote_payment",
          amount: balanceDue || total,
          max_amount: balanceDue,
          currency: invoice.currency,
        }}
      />
      <GeneratePaymentLinkModal
        open={linkOpen}
        onClose={() => {
          setLinkOpen(false);
          refresh();
        }}
        defaults={{
          invoice_id: invoice.id,
          contact_id: invoice.contact_id,
          amount: balanceDue || total,
          max_amount: balanceDue,
          currency: invoice.currency,
        }}
      />
    </>
  );
}
