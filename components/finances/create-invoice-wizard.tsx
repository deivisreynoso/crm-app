"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  FileText,
  HandCoins,
  Link2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ContactSelect } from "@/components/forms/contact-select";
import {
  AcceptedQuoteSelect,
  type AcceptedQuoteOption,
} from "@/components/forms/accepted-quote-select";
import { INVOICE_TYPES, type InvoiceTypeId } from "@/lib/finances/invoice-types";
import { useCreateInvoiceWizard } from "@/hooks/useFinances";
import { formatApiError } from "@/lib/validation-errors";
import { formatCurrency } from "@/lib/utils";
import type { CrmDocument } from "@/types";

type WizardStep = "type" | "details" | "collection" | "review";

type LineDraft = {
  key: string;
  description: string;
  quantity: string;
  unit_price: string;
};

function resolveInvoiceCurrency(
  docCurrency?: string | null,
  defaultCurrency?: string | null
): "USD" | "MXN" {
  if (docCurrency === "MXN" || docCurrency === "USD") return docCurrency;
  if (defaultCurrency === "MXN" || defaultCurrency === "USD") return defaultCurrency;
  return "USD";
}

type Props = {
  open: boolean;
  onClose: () => void;
  presetQuoteId?: string;
  presetContactId?: string;
};

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "type", label: "Type" },
  { id: "details", label: "Details" },
  { id: "collection", label: "Payment" },
  { id: "review", label: "Review" },
];

function recalcLines(lines: LineDraft[], taxRate: number) {
  const parsed = lines.map((l) => {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unit_price) || 0;
    const line_total = Math.round(qty * price * 100) / 100;
    return { ...l, quantity: String(qty || 1), line_total };
  });
  const subtotal = parsed.reduce((s, l) => s + Number(l.line_total || 0), 0);
  const tax_amount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  return { lines: parsed, subtotal, tax_amount, total: subtotal + tax_amount };
}

export function CreateInvoiceWizard({
  open,
  onClose,
  presetQuoteId,
  presetContactId,
}: Props) {
  const quotePreset = presetQuoteId ?? "";
  const contactPreset = presetContactId ?? "";

  const router = useRouter();
  const wizard = useCreateInvoiceWizard();

  const [step, setStep] = useState<WizardStep>("type");
  const [invoiceType, setInvoiceType] = useState<InvoiceTypeId>(
    presetQuoteId ? "quote" : "services"
  );
  const [quoteId, setQuoteId] = useState(presetQuoteId ?? "");
  const [contactId, setContactId] = useState("");
  const [currency, setCurrency] = useState<"USD" | "MXN">("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [lines, setLines] = useState<LineDraft[]>([
    { key: "1", description: "Services", quantity: "1", unit_price: "0" },
  ]);
  const [collectionMethod, setCollectionMethod] = useState<"manual" | "payment_link">("manual");
  const [error, setError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    invoiceId: string;
    email_sent?: boolean;
    email_error?: string;
    payment_link_url?: string | null;
  } | null>(null);

  const isQuoteType = invoiceType === "quote";
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const totals = useMemo(
    () => recalcLines(lines, Number(taxRate) || 0),
    [lines, taxRate]
  );

  useEffect(() => {
    if (!open) return;
    setStep(quotePreset ? "details" : "type");
    setInvoiceType(quotePreset ? "quote" : "services");
    setQuoteId(quotePreset);
    setContactId(contactPreset);
    setCurrency("USD");
    setTaxRate("0");
    setLines([{ key: "1", description: "Services", quantity: "1", unit_price: "0" }]);
    setCollectionMethod("manual");
    setError(null);
    setSubmitResult(null);
    if (quotePreset) void loadQuote(quotePreset);
  }, [open, quotePreset, contactPreset]);

  async function loadQuote(id: string) {
    setLoadingQuote(true);
    try {
      const [{ data }, settingsRes] = await Promise.all([
        axios.get<
          CrmDocument & {
            line_items?: Array<{
              description: string;
              quantity: number;
              unit_price: number;
              line_total: number;
            }>;
            currency?: string;
          }
        >(`/api/documents/${id}`),
        axios.get<{ default_currency?: string }>("/api/settings"),
      ]);
      if (data.contact_id) setContactId(data.contact_id);
      setCurrency(resolveInvoiceCurrency(data.currency, settingsRes.data.default_currency));
      setTaxRate(String(data.tax_rate ?? 0));
      const items = data.line_items ?? [];
      if (items.length) {
        setLines(
          items.map((l, i) => ({
            key: `q-${i}`,
            description: l.description,
            quantity: String(l.quantity),
            unit_price: String(l.unit_price),
          }))
        );
      }
    } catch {
      setError("Could not load quote details.");
    } finally {
      setLoadingQuote(false);
    }
  }

  function onQuoteChange(id: string, quoteOption?: AcceptedQuoteOption | null) {
    setQuoteId(id);
    if (id) {
      if (quoteOption) {
        setCurrency(resolveInvoiceCurrency(quoteOption.currency));
        if (quoteOption.contact_id) setContactId(quoteOption.contact_id);
        setTaxRate(String(quoteOption.tax_rate ?? 0));
      }
      void loadQuote(id);
    } else {
      setContactId(contactPreset);
    }
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: `n-${Date.now()}`, description: "", quantity: "1", unit_price: "0" },
    ]);
  }

  function validateStep(target: WizardStep): string | null {
    if (target === "type") return null;
    if (isQuoteType && !quoteId) return "Select an accepted quote.";
    if (!contactId) return "Select a contact.";
    if (totals.total <= 0) return "Invoice total must be greater than zero.";
    if (target === "collection") return null;
    return null;
  }

  function goNext() {
    setError(null);
    const nextMap: Record<WizardStep, WizardStep | null> = {
      type: "details",
      details: "collection",
      collection: "review",
      review: null,
    };
    const err = validateStep(step === "type" ? "details" : step === "details" ? "collection" : "review");
    if (err && step !== "type") {
      setError(err);
      return;
    }
    if (step === "details") {
      const detailErr = validateStep("collection");
      if (detailErr) {
        setError(detailErr);
        return;
      }
    }
    const next = nextMap[step];
    if (next) setStep(next);
  }

  function goBack() {
    setError(null);
    const prevMap: Record<WizardStep, WizardStep | null> = {
      type: null,
      details: presetQuoteId ? null : "type",
      collection: "details",
      review: "collection",
    };
    const prev = prevMap[step];
    if (prev) setStep(prev);
  }

  async function submit() {
    setError(null);
    const detailErr = validateStep("review");
    if (detailErr) {
      setError(detailErr);
      return;
    }

    try {
      const result = await wizard.mutateAsync({
        invoice_type: invoiceType,
        quote_id: isQuoteType ? quoteId : null,
        contact_id: contactId,
        line_items: totals.lines.map((l) => ({
          description: l.description || "Line item",
          quantity: Number(l.quantity) || 1,
          unit_price: Number(l.unit_price) || 0,
          line_total:
            Math.round((Number(l.quantity) || 1) * (Number(l.unit_price) || 0) * 100) / 100,
        })),
        subtotal: totals.subtotal,
        tax_rate: Number(taxRate) || 0,
        tax_amount: totals.tax_amount,
        total: totals.total,
        currency,
        collection_method: collectionMethod,
      });

      setSubmitResult({
        invoiceId: result.invoice.id,
        email_sent: result.email_sent,
        email_error: result.email_error,
        payment_link_url: result.payment_link_url,
      });
    } catch (err) {
      setError(formatApiError(err, "Could not create invoice."));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create invoice" size="xl">
      <div className="space-y-6">
        <nav className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = s.id === step;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done || active
                      ? "bg-[var(--secondary)] text-white"
                      : "bg-[var(--card-border)] text-body-muted"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium truncate hidden sm:block ${
                    active ? "text-heading" : "text-body-muted"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="h-px flex-1 bg-[var(--card-border)] mx-1" />
                )}
              </div>
            );
          })}
        </nav>

        {step === "type" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INVOICE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setInvoiceType(t.id);
                  if (t.id !== "quote") setQuoteId("");
                }}
                className={`text-left rounded-lg border p-4 transition-colors ${
                  invoiceType === t.id
                    ? "border-[var(--secondary)] bg-[var(--secondary)]/8 ring-2 ring-[var(--secondary)]/25"
                    : "border-[var(--card-border)] hover:border-[var(--secondary)]/40"
                }`}
              >
                <p className="text-sm font-semibold text-heading">{t.label}</p>
                <p className="text-xs text-body-muted mt-1">{t.description}</p>
              </button>
            ))}
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            {isQuoteType ? (
              <>
                <AcceptedQuoteSelect
                  value={quoteId}
                  onChange={onQuoteChange}
                  locked={Boolean(presetQuoteId)}
                  allowStandalone={false}
                />
                {loadingQuote && (
                  <p className="text-xs text-body-muted">Loading quote details…</p>
                )}
              </>
            ) : null}

            <ContactSelect
              value={contactId}
              onChange={setContactId}
              required
              disabled={isQuoteType && Boolean(quoteId)}
              label="Contact"
            />

            {!isQuoteType && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-heading">Line items</p>
                  <button
                    type="button"
                    className="text-xs text-[var(--secondary)] hover:underline"
                    onClick={addLine}
                  >
                    + Add line
                  </button>
                </div>
                {lines.map((line) => (
                  <div key={line.key} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <input
                        className="input-field w-full text-sm"
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="input-field w-full text-sm"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        step="0.01"
                        className="input-field w-full text-sm"
                        placeholder="Unit price"
                        value={line.unit_price}
                        onChange={(e) => updateLine(line.key, { unit_price: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <div>
                <label className="text-xs font-medium block mb-1">Tax rate (%)</label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  disabled={isQuoteType && loadingQuote}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Currency</label>
                <select
                  className="input-field w-full"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "MXN")}
                  disabled={isQuoteType && Boolean(quoteId)}
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-right space-x-4 text-body-muted">
              <span>Subtotal: {formatCurrency(totals.subtotal, currency)}</span>
              <span>Tax: {formatCurrency(totals.tax_amount, currency)}</span>
              <span className="font-semibold text-heading">
                Total: {formatCurrency(totals.total, currency)}
              </span>
            </div>
          </div>
        )}

        {step === "collection" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCollectionMethod("manual")}
              className={`text-left rounded-lg border p-4 ${
                collectionMethod === "manual"
                  ? "border-[var(--secondary)] bg-[var(--secondary)]/8 ring-2 ring-[var(--secondary)]/25"
                  : "border-[var(--card-border)]"
              }`}
            >
              <HandCoins className="h-5 w-5 text-[var(--secondary)] mb-2" />
              <p className="text-sm font-semibold text-heading">Manual payment</p>
              <p className="text-xs text-body-muted mt-1">
                Invoice stays open until fully paid. Log one or more partial payments as they arrive.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setCollectionMethod("payment_link")}
              className={`text-left rounded-lg border p-4 ${
                collectionMethod === "payment_link"
                  ? "border-[var(--secondary)] bg-[var(--secondary)]/8 ring-2 ring-[var(--secondary)]/25"
                  : "border-[var(--card-border)]"
              }`}
            >
              <CreditCard className="h-5 w-5 text-[var(--secondary)] mb-2" />
              <p className="text-sm font-semibold text-heading">Payment link</p>
              <p className="text-xs text-body-muted mt-1">
                Customer receives a <strong>Pay now</strong> email. Partial payments are supported —
                create additional links for the remaining balance until paid in full.
              </p>
            </button>
          </div>
        )}

        {submitResult ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 text-sm">
            <p className="font-semibold text-heading">Invoice created</p>
            {submitResult.email_sent === true && (
              <p className="text-body-muted">Invoice email sent to the customer.</p>
            )}
            {submitResult.email_sent === false && submitResult.email_error && (
              <p className="text-[var(--error)]">Email not sent: {submitResult.email_error}</p>
            )}
            {submitResult.payment_link_url && (
              <p className="text-body-muted break-all">
                Payment link:{" "}
                <a
                  href={submitResult.payment_link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--secondary)] hover:underline"
                >
                  {submitResult.payment_link_url}
                </a>
              </p>
            )}
            <Button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/finances/invoices/${submitResult.invoiceId}`);
              }}
            >
              Open invoice
            </Button>
          </div>
        ) : null}

        {step === "review" && !submitResult && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--card-border)] divide-y divide-[var(--card-border)] text-sm">
              <div className="px-4 py-3 flex justify-between gap-4">
                <span className="text-body-muted">Type</span>
                <span className="font-medium text-heading">
                  {INVOICE_TYPES.find((t) => t.id === invoiceType)?.label}
                </span>
              </div>
              {isQuoteType && quoteId && (
                <div className="px-4 py-3 flex justify-between gap-4">
                  <span className="text-body-muted">Quote</span>
                  <span className="font-medium">Linked</span>
                </div>
              )}
              <div className="px-4 py-3 flex justify-between gap-4">
                <span className="text-body-muted">Total</span>
                <span className="font-semibold">{formatCurrency(totals.total, currency)}</span>
              </div>
              <div className="px-4 py-3 flex justify-between gap-4">
                <span className="text-body-muted">Collection</span>
                <span className="font-medium flex items-center gap-1.5">
                  {collectionMethod === "manual" ? (
                    <>
                      <HandCoins className="h-4 w-4" /> Manual — pending until logged
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" /> Payment link — email with Pay now
                    </>
                  )}
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between gap-4">
                <span className="text-body-muted">Initial status</span>
                <span className="font-medium">Pending payment</span>
              </div>
            </div>

            {(isQuoteType || lines.length > 0) && (
              <div className="rounded-lg border border-[var(--card-border)] overflow-hidden text-sm">
                <div className="px-4 py-2 bg-[var(--surface-subtle)] font-medium text-heading">
                  Line items
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-body-muted border-b border-[var(--card-border)]">
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                      <th className="text-right px-4 py-2 font-medium">Qty</th>
                      <th className="text-right px-4 py-2 font-medium">Unit</th>
                      <th className="text-right px-4 py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totals.lines.map((line) => {
                      const qty = Number(line.quantity) || 1;
                      const unit = Number(line.unit_price) || 0;
                      const lineTotal =
                        Math.round(qty * unit * 100) / 100;
                      return (
                        <tr key={line.key} className="border-b border-[var(--card-border)] last:border-0">
                          <td className="px-4 py-2">{line.description || "Line item"}</td>
                          <td className="px-4 py-2 text-right">{qty}</td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(unit, currency)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatCurrency(lineTotal, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-[var(--error)] bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex justify-between gap-2 pt-2 border-t border-[var(--card-border)]">
          <div>
            {step !== "type" && !(step === "details" && presetQuoteId) && (
              <Button type="button" variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {submitResult ? null : step !== "review" ? (
              <Button type="button" onClick={goNext} disabled={loadingQuote}>
                Next
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button type="button" onClick={() => void submit()} disabled={wizard.isPending}>
                <FileText className="h-4 w-4 mr-1.5" />
                {wizard.isPending ? "Creating…" : "Create invoice"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
