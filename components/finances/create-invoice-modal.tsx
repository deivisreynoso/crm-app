"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateInvoice } from "@/hooks/useFinances";
import { ContactSearchCombobox } from "@/components/forms/contact-search-combobox";

type Props = {
  open: boolean;
  onClose: () => void;
  quoteDefaults?: {
    quote_id: string;
    contact_id: string;
    line_items: Array<{ description: string; quantity: number; unit_price: number; line_total: number }>;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    currency: "USD" | "MXN";
  };
};

export function CreateInvoiceModal({ open, onClose, quoteDefaults }: Props) {
  const createInvoice = useCreateInvoice();
  const [contactId, setContactId] = useState(quoteDefaults?.contact_id ?? "");
  const [description, setDescription] = useState("Service");
  const [amount, setAmount] = useState(
    quoteDefaults?.total ? String(quoteDefaults.total) : ""
  );
  const [currency, setCurrency] = useState<"USD" | "MXN">(
    quoteDefaults?.currency ?? "USD"
  );
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const total = Number(amount);
    if (!contactId || !total || total <= 0) {
      setError("Contact and amount are required.");
      return;
    }

    const lineItems = quoteDefaults?.line_items ?? [
      { description, quantity: 1, unit_price: total, line_total: total },
    ];
    const subtotal = quoteDefaults?.subtotal ?? total;
    const taxRate = quoteDefaults?.tax_rate ?? 0;
    const taxAmount = quoteDefaults?.tax_amount ?? 0;

    try {
      await createInvoice.mutateAsync({
        quote_id: quoteDefaults?.quote_id ?? null,
        contact_id: contactId,
        line_items: lineItems,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        currency,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invoice.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-[var(--card)] border border-[var(--card-border)] p-6 space-y-4">
        <h2 className="text-lg font-semibold">Create invoice</h2>
        <form className="space-y-3" onSubmit={(e) => void submit(e)}>
          <div>
            <label className="text-xs font-medium block mb-1">Contact</label>
            <ContactSearchCombobox value={contactId} onChange={setContactId} />
          </div>
          {!quoteDefaults && (
            <div>
              <label className="text-xs font-medium block mb-1">Line description</label>
              <input
                className="input-field w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Total</label>
              <input
                type="number"
                step="0.01"
                className="input-field w-full"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
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
          {error && <p className="text-sm text-[var(--error)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              Save draft
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
