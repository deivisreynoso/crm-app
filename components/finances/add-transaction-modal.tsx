"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateFinanceTransaction } from "@/hooks/useFinanceTransactions";
import { useFinanceCategories } from "@/hooks/useFinances";
import { ContactSelect } from "@/components/forms/contact-select";
import type { Invoice } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  invoices?: Invoice[];
  defaults?: {
    type?: "income" | "expense";
    invoice_id?: string;
    contact_id?: string;
    category_slug?: string;
    amount?: number;
    max_amount?: number;
    currency?: "USD" | "MXN";
  };
};

export function AddTransactionModal({ open, onClose, invoices = [], defaults }: Props) {
  const createTx = useCreateFinanceTransaction();
  const { data: categories = [] } = useFinanceCategories();
  const [type, setType] = useState<"income" | "expense">(defaults?.type ?? "income");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "MXN">(defaults?.currency ?? "USD");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("");
  const [contactId, setContactId] = useState(defaults?.contact_id ?? "");
  const [invoiceId, setInvoiceId] = useState(defaults?.invoice_id ?? "");
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedInvoice = invoices.find((i) => i.id === invoiceId);

  useEffect(() => {
    if (!open) return;
    setType(defaults?.type ?? "income");
    setAmount(defaults?.amount ? String(defaults.amount) : "");
    setCurrency(defaults?.currency ?? "USD");
    setContactId(defaults?.contact_id ?? "");
    setInvoiceId(defaults?.invoice_id ?? "");
    setError(null);
  }, [open, defaults]);

  useEffect(() => {
    if (type === "income" && selectedInvoice) {
      setContactId(selectedInvoice.contact_id);
      setCurrency(selectedInvoice.currency);
    }
  }, [type, selectedInvoice]);

  useEffect(() => {
    const kind = type === "income" ? "income" : "expense";
    const slug = defaults?.category_slug ?? (type === "income" ? "quote_payment" : "other_expense");
    const match = categories.find((c) => c.kind === kind && c.slug === slug);
    if (match) setCategoryId(match.id);
    else {
      const first = categories.find((c) => c.kind === kind);
      if (first) setCategoryId(first.id);
    }
  }, [categories, type, defaults?.category_slug]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!categoryId) {
      setError("Select a category.");
      return;
    }
    if (type === "income" && !contactId) {
      setError("Contact is required for income.");
      return;
    }
    if (type === "income" && !invoiceId) {
      setError("Invoice is required for income.");
      return;
    }
    if (
      type === "income" &&
      defaults?.max_amount != null &&
      parsed > defaults.max_amount + 0.001
    ) {
      setError(`Amount cannot exceed remaining balance (${defaults.max_amount.toFixed(2)}).`);
      return;
    }

    try {
      await createTx.mutateAsync({
        type,
        amount: parsed,
        currency,
        transaction_date: transactionDate,
        category_id: categoryId,
        contact_id: contactId || null,
        invoice_id: type === "income" ? invoiceId : null,
        description: description || null,
        vendor_name: type === "expense" ? vendorName || null : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save transaction.");
    }
  }

  const filteredCategories = categories.filter((c) => c.kind === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-[var(--card)] border border-[var(--card-border)] shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-heading">Add transaction</h2>

        <div className="flex gap-2">
          {(["income", "expense"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                type === t
                  ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                  : "border-[var(--card-border)]"
              }`}
            >
              {t === "income" ? "Income" : "Expense"}
            </button>
          ))}
        </div>

        <form className="space-y-3" onSubmit={(e) => void submit(e)}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                className="input-field w-full"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={defaults?.max_amount}
                required
              />
              {defaults?.max_amount != null && (
                <p className="text-[11px] text-body-muted mt-1">
                  Max {defaults.max_amount.toFixed(2)} — partial payments allowed
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Currency</label>
              <select
                className="input-field w-full"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "USD" | "MXN")}
              >
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">Date</label>
            <input
              type="date"
              className="input-field w-full"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">Category</label>
            <select
              className="input-field w-full"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {type === "income" && (
            <div>
              <label className="text-xs font-medium block mb-1">Invoice</label>
              {invoices.length > 0 ? (
                <select
                  className="input-field w-full"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  required
                >
                  <option value="">Select invoice…</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.contact?.first_name} {inv.contact?.last_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input-field w-full"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  placeholder="Invoice UUID"
                  required
                />
              )}
              {selectedInvoice?.quote?.quote_reference && (
                <p className="text-xs text-body-muted mt-1">
                  Quote: {selectedInvoice.quote.quote_reference} (read-only, derived from invoice)
                </p>
              )}
            </div>
          )}

          {type === "income" && (
            <ContactSelect value={contactId} onChange={setContactId} label="Contact" />
          )}

          {type === "expense" && (
            <div>
              <label className="text-xs font-medium block mb-1">Vendor</label>
              <input
                className="input-field w-full"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1">Description</label>
            <input
              className="input-field w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-[var(--error)]">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTx.isPending}>
              {createTx.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
