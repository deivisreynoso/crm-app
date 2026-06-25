"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ChevronLeft, ChevronRight, Copy, FileDown, Mail, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContactSelect } from "@/components/forms/contact-select";
import { AcceptedQuoteSelect } from "@/components/forms/accepted-quote-select";
import { FormSection } from "@/components/ui/form-section";
import { BillingWorkflowPanel } from "@/components/finances/billing-workflow-panel";
import { InvoicePaymentsPanel } from "@/components/finances/invoice-payments-panel";
import { useFinanceTransactions } from "@/hooks/useFinanceTransactions";
import { SendInvoiceEmailModal } from "@/components/finances/send-invoice-email-modal";
import {
  useDeleteInvoice,
  useDuplicateInvoice,
  useInvoice,
  usePaymentLinks,
  useUpdateInvoice,
} from "@/hooks/useFinances";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { useWorkspace } from "@/components/crm/workspace-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { formatApiError } from "@/lib/validation-errors";
import { formatCurrency } from "@/lib/utils";
import type { InvoiceLineItem } from "@/types";

type DraftLine = InvoiceLineItem & { key: string };

function linesFromInvoice(items: InvoiceLineItem[]): DraftLine[] {
  return items.map((line, i) => ({
    ...line,
    key: `line-${i}`,
  }));
}

function recalc(lines: DraftLine[], taxRate: number) {
  const subtotal = lines.reduce((s, l) => s + Number(l.line_total || 0), 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

type Props = {
  invoiceId: string;
};

export function InvoiceEditor({ invoiceId }: Props) {
  const router = useRouter();
  const { canWrite, canManage } = useWorkspaceCapabilities();
  const { ctx } = useWorkspace();
  const isOwner = ctx?.isWorkspaceOwner ?? false;
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);
  const { data: paymentLinks = [] } = usePaymentLinks({ invoice_id: invoiceId });
  const { data: invoiceTxs = [] } = useFinanceTransactions({
    invoice_id: invoiceId,
    type: "income",
  });
  const updateInvoice = useUpdateInvoice(invoiceId);
  const duplicateInvoice = useDuplicateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const { confirm, dialogProps } = useConfirmDialog();

  const [contactId, setContactId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [footerText, setFooterText] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [toast, setToast] = useState<{ text: string; ok?: boolean } | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [pdfPanelOpen, setPdfPanelOpen] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadedRef = useRef({ id: "" });
  useEffect(() => {
    if (!invoice || loadedRef.current.id === invoice.id) return;
    loadedRef.current.id = invoice.id;
    setContactId(invoice.contact_id);
    setDueDate(invoice.due_date?.slice(0, 10) ?? "");
    setNotes(invoice.notes ?? "");
    setFooterText(invoice.footer_text ?? "");
    setTaxRate(String(invoice.tax_rate ?? 0));
    setLines(linesFromInvoice(invoice.line_items ?? []));
  }, [invoice]);

  const totals = useMemo(
    () => recalc(lines, Number(taxRate) || 0),
    [lines, taxRate]
  );

  const readOnly = !canWrite || (invoice?.status !== "draft" && invoice?.status !== undefined);

  const amountPaid = useMemo(
    () =>
      invoiceTxs
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [invoiceTxs]
  );

  async function saveDraft() {
    if (!invoice) return;
    try {
      await updateInvoice.mutateAsync({
        contact_id: contactId,
        due_date: dueDate || null,
        notes: notes || null,
        footer_text: footerText || null,
        tax_rate: Number(taxRate) || 0,
        line_items: lines.map(({ description, quantity, unit_price, line_total }) => ({
          description,
          quantity,
          unit_price,
          line_total,
        })),
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total: totals.total,
      });
      setToast({ text: "Draft saved", ok: true });
    } catch (err) {
      setToast({ text: formatApiError(err, "Save failed"), ok: false });
    }
  }

  async function fetchPdfUrl() {
    setPdfLoading(true);
    try {
      const { data } = await axios.get<{ file_url: string }>(
        `/api/finances/invoices/${invoiceId}/pdf`
      );
      setPdfUrl(data.file_url ?? null);
      return data.file_url ?? null;
    } catch {
      setPdfUrl(null);
      return null;
    } finally {
      setPdfLoading(false);
    }
  }

  useEffect(() => {
    if (!pdfPanelOpen || !invoice) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPdfUrl();
  }, [pdfPanelOpen, invoiceId, invoice?.updated_at]);

  async function downloadPdf() {
    const url = pdfUrl ?? (await fetchPdfUrl());
    if (url) window.open(url, "_blank");
    else setToast({ text: "PDF is not available yet.", ok: false });
  }

  async function voidInvoice() {
    const ok = await confirm({
      title: "Void this invoice?",
      description: "This cannot be undone.",
      confirmLabel: "Void invoice",
      destructive: true,
    });
    if (!ok) return;
    try {
      await axios.post(`/api/finances/invoices/${invoiceId}/void`);
      void refetch();
      setToast({ text: "Invoice voided.", ok: true });
    } catch {
      setToast({ text: "Could not void invoice.", ok: false });
    }
  }

  async function deletePermanently() {
    if (!invoice) return;
    const ok = await confirm({
      title: `Delete invoice ${invoice.invoice_number}?`,
      description:
        "Related payment records will also be removed. This cannot be undone.",
      confirmLabel: "Delete permanently",
      destructive: true,
    });
    if (!ok) return;
    await deleteInvoice.mutateAsync(invoiceId);
    router.push("/finances/invoices");
  }

  async function duplicate() {
    const copy = await duplicateInvoice.mutateAsync(invoiceId);
    router.push(`/finances/invoices/${copy.id}`);
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        const qty = Number(next.quantity) || 0;
        const price = Number(next.unit_price) || 0;
        next.line_total = Math.round(qty * price * 100) / 100;
        return next;
      })
    );
  }

  if (isLoading) {
    return <p className="text-sm text-body-muted">Loading invoice…</p>;
  }

  if (error || !invoice) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--error)]">Invoice not found.</p>
        <Link href="/finances/invoices" className="text-sm text-[var(--primary)] hover:underline">
          ← Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[520px] -m-6 lg:-m-8">
      <ConfirmDialog {...dialogProps} />
      <header className="shrink-0 flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3 border-b border-[var(--card-border)] bg-[var(--card)]">
        <Link href="/finances/invoices" className="text-xs text-body-muted hover:text-[var(--primary)]">
          ← Invoices
        </Link>
        <span className="text-lg font-semibold text-heading">{invoice.invoice_number}</span>
        <Badge
          variant={
            invoice.status === "pending" || invoice.status === "partially_paid"
              ? "warning"
              : invoice.status === "paid"
                ? "success"
                : "info"
          }
        >
          {invoice.status === "partially_paid" ? "partially paid" : invoice.status}
        </Badge>
        {invoice.collection_method && (
          <span className="text-xs text-body-muted capitalize">
            · {invoice.collection_method.replace("_", " ")}
          </span>
        )}
        {invoice.quote?.quote_reference && (
          <Link
            href={`/quotes/${invoice.quote_id}`}
            className="text-xs text-[var(--secondary)] hover:underline"
          >
            Quote {invoice.quote.quote_reference}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {toast && (
            <span
              className={`text-xs font-medium px-2 py-1 rounded-md ${
                toast.ok ? "bg-emerald-600 text-white" : "bg-red-500/10 text-[var(--error)]"
              }`}
            >
              {toast.text}
            </span>
          )}
          {canWrite && invoice.status === "draft" && (
            <Button variant="outline" size="sm" disabled={updateInvoice.isPending} onClick={() => void saveDraft()}>
              Save draft
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void downloadPdf()}>
            <FileDown className="h-4 w-4 mr-1.5" />
            Download PDF
          </Button>
          {canWrite && !["voided", "paid"].includes(invoice.status) && (
            <Button variant="outline" size="sm" onClick={() => setSendOpen(true)}>
              <Mail className="h-4 w-4 mr-1.5" />
              Send
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => void duplicate()}>
              <Copy className="h-4 w-4 mr-1.5" />
              Duplicate
            </Button>
          )}
          {canManage && !["voided", "paid"].includes(invoice.status) && (
            <Button variant="outline" size="sm" onClick={() => void voidInvoice()}>
              Void
            </Button>
          )}
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              className="text-[var(--error)] border-red-200 hover:bg-red-500/10"
              disabled={deleteInvoice.isPending}
              onClick={() => void deletePermanently()}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
        <div className="max-w-3xl space-y-6">
          {invoice.status !== "voided" && (
            <BillingWorkflowPanel
              hasQuote={Boolean(invoice.quote_id)}
              hasInvoice
              quoteAccepted={Boolean(invoice.quote_id)}
              quoteId={invoice.quote_id ?? undefined}
              invoiceId={invoice.id}
              invoiceStatus={invoice.status}
              hasActiveLink={paymentLinks.some(
                (l) => l.invoice_id === invoice.id && l.status === "active"
              )}
              amountPaid={amountPaid}
              total={Number(invoice.total)}
              onInvoicePage
              onRequestSend={() => setSendOpen(true)}
            />
          )}

          <FormSection
            title="Invoice & customer"
            description={
              invoice.quote_id
                ? "Linked to an accepted quote."
                : "Optionally link an accepted quote while this invoice is still a draft."
            }
          >
            {invoice.quote_id ? (
              <AcceptedQuoteSelect
                value={invoice.quote_id}
                onChange={() => undefined}
                locked
                allowStandalone={false}
              />
            ) : (
              <p className="text-xs text-body-muted">
                No linked quote. Standalone invoices are created without a quote reference.
              </p>
            )}
            <ContactSelect
              value={contactId}
              onChange={setContactId}
              disabled={readOnly || Boolean(invoice.quote_id)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Due date</label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Currency</label>
                <input className="input-field w-full" value={invoice.currency} disabled readOnly />
              </div>
            </div>
          </FormSection>

          <FormSection title="Line items">
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.key} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <input
                      className="input-field w-full text-sm"
                      value={line.description}
                      onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      className="input-field w-full text-sm"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      className="input-field w-full text-sm"
                      value={line.unit_price}
                      onChange={(e) => updateLine(line.key, { unit_price: Number(e.target.value) })}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="col-span-2 text-sm text-right font-medium">
                    {formatCurrency(line.line_total, invoice.currency)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end text-sm space-x-6 pt-2 border-t border-[var(--card-border)]">
              <span>Subtotal: {formatCurrency(totals.subtotal, invoice.currency)}</span>
              <span>
                Tax ({taxRate}%): {formatCurrency(totals.taxAmount, invoice.currency)}
              </span>
              <span className="font-semibold">Total: {formatCurrency(totals.total, invoice.currency)}</span>
            </div>
          </FormSection>

          {invoice.status !== "voided" && (
            <InvoicePaymentsPanel invoice={invoice} onUpdated={() => void refetch()} />
          )}

          <FormSection title="Notes & footer">
            <label className="text-xs font-medium block">Notes</label>
            <textarea
              className="input-field w-full min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={readOnly}
            />
            <label className="text-xs font-medium block">Footer</label>
            <textarea
              className="input-field w-full min-h-[60px]"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              disabled={readOnly}
            />
          </FormSection>
        </div>
        </div>

        <aside
          className={`shrink-0 border-l border-[var(--card-border)] bg-[var(--card)] flex flex-col transition-[width] duration-200 ${
            pdfPanelOpen ? "w-full sm:w-[min(42vw,520px)]" : "w-10"
          }`}
        >
          <button
            type="button"
            className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium text-body-muted border-b border-[var(--card-border)] hover:bg-[var(--sidebar-hover)]"
            onClick={() => setPdfPanelOpen((v) => !v)}
            aria-expanded={pdfPanelOpen}
          >
            {pdfPanelOpen ? (
              <>
                <ChevronRight className="h-4 w-4" />
                Hide preview
              </>
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden />
            )}
          </button>
          {pdfPanelOpen && (
            <div className="flex-1 min-h-0 relative">
              {pdfLoading && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-body-muted bg-[var(--card)]/80 z-10">
                  Loading PDF…
                </p>
              )}
              {pdfUrl ? (
                <iframe
                  title="Invoice PDF preview"
                  src={pdfUrl}
                  className="w-full h-full min-h-[480px] border-0"
                />
              ) : (
                !pdfLoading && (
                  <p className="p-4 text-sm text-body-muted">PDF preview unavailable.</p>
                )
              )}
            </div>
          )}
        </aside>
      </div>

      <SendInvoiceEmailModal
        invoice={invoice}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={() => void refetch()}
      />
    </div>
  );
}
