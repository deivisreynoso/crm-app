"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateInvoiceWizard } from "@/components/finances/create-invoice-wizard";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BillingWorkflowPanel } from "@/components/finances/billing-workflow-panel";
import { isInvoiceFullyPaid, paymentCollectionLabel } from "@/lib/finances/billing-state";
import { useFinanceTransactions } from "@/hooks/useFinanceTransactions";
import { useInvoices, usePaymentLinks } from "@/hooks/useFinances";
import { formatCurrency } from "@/lib/utils";
import type { CrmDocument } from "@/types";

type Props = {
  doc: CrmDocument & {
    payment_status?: string;
    amount_paid?: number;
    total_amount?: number;
    currency?: string;
    status?: string;
    accepted_at?: string | null;
  };
};

export function QuoteFinancesTab({ doc }: Props) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: invoices = [] } = useInvoices({ quote_id: doc.id });
  const activeInvoice = invoices.find((i) => i.status !== "voided");
  const { data: links = [] } = usePaymentLinks(
    activeInvoice ? { invoice_id: activeInvoice.id } : undefined,
    { enabled: Boolean(activeInvoice) }
  );

  const { data: invoiceTxs = [] } = useFinanceTransactions(
    { invoice_id: activeInvoice?.id ?? "", type: "income" },
    { enabled: Boolean(activeInvoice) }
  );

  const activeLink = links.find((l) => l.status === "active");

  const total = Number(doc.total_amount ?? 0);
  const paid = Number(doc.amount_paid ?? 0);
  const amountPaidFromTxs = invoiceTxs
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const amountPaid = activeInvoice ? amountPaidFromTxs : paid;
  const balanceDue = Math.max(0, total - amountPaid);
  const pct = total > 0 ? Math.min(100, Math.round((amountPaid / total) * 100)) : 0;
  const currency = doc.currency ?? "USD";

  const isAccepted =
    doc.status === "accepted" || doc.status === "signed" || !!doc.accepted_at;

  const fullyPaid = isInvoiceFullyPaid({
    total,
    amountPaid,
    invoiceStatus: activeInvoice?.status,
  });
  const statusLabel = paymentCollectionLabel({
    total,
    amountPaid,
    invoiceStatus: activeInvoice?.status,
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-3">
        <p className="text-sm text-body-muted">
          Billing is managed through invoices in{" "}
          <Link href="/finances/invoices" className="text-[var(--secondary)] hover:underline font-medium">
            Finances
          </Link>
          . Payment links and manual payments are recorded on the invoice.
        </p>
      </div>

      {isAccepted ? (
        <BillingWorkflowPanel
          hasQuote
          hasInvoice={Boolean(activeInvoice)}
          quoteAccepted
          quoteId={doc.id}
          invoiceId={activeInvoice?.id}
          invoiceStatus={activeInvoice?.status}
          hasActiveLink={Boolean(activeLink)}
          amountPaid={amountPaid}
          total={total}
          onCreateInvoice={() => setWizardOpen(true)}
        />
      ) : (
        <section className="surface-card border border-[var(--card-border)] p-4">
          <p className="text-sm text-body-muted text-center py-4">
            Accept this quote to start the billing workflow.
          </p>
        </section>
      )}

      <section className="surface-card overflow-hidden border border-[var(--card-border)]">
        <div className="border-l-4 border-[var(--secondary)] bg-[var(--surface-subtle)] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-heading">Balance summary</h3>
          <Badge variant={fullyPaid ? "success" : "info"}>{statusLabel}</Badge>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-body-muted">Balance due</p>
            <p className="text-xl font-semibold text-heading tabular-nums">
              {formatCurrency(balanceDue, currency)}
            </p>
            <p className="text-xs text-body-muted mt-1">
              {formatCurrency(amountPaid, currency)} paid of {formatCurrency(total, currency)}
            </p>
          </div>
          <div className="h-2 rounded-full bg-[var(--card-border)] overflow-hidden">
            <div
              className="h-full bg-[var(--secondary)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {!activeInvoice && isAccepted && (
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
              >
                Create invoice
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </button>
            )}
            {activeInvoice && (
              <Link
                href={`/finances/invoices/${activeInvoice.id}`}
                className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
              >
                Manage invoice
                <ExternalLink className="h-4 w-4 ml-1.5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {activeInvoice && (
        <section className="surface-card border border-[var(--card-border)] p-4 space-y-2">
          <h4 className="text-sm font-semibold text-heading">Linked invoice</h4>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link
              href={`/finances/invoices/${activeInvoice.id}`}
              className="font-medium text-[var(--secondary)] hover:underline"
            >
              {activeInvoice.invoice_number}
            </Link>
            <Badge variant="info">{activeInvoice.status}</Badge>
          </div>
        </section>
      )}

      <CreateInvoiceWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        presetQuoteId={doc.id}
      />
    </div>
  );
}
