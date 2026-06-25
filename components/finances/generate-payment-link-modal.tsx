"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreatePaymentLink } from "@/hooks/useFinances";

type Props = {
  open: boolean;
  onClose: () => void;
  defaults?: {
    invoice_id?: string;
    contact_id?: string;
    amount?: number;
    max_amount?: number;
    currency?: "USD" | "MXN";
  };
};

export function GeneratePaymentLinkModal({ open, onClose, defaults }: Props) {
  const createLink = useCreatePaymentLink();
  const [invoiceId, setInvoiceId] = useState(defaults?.invoice_id ?? "");
  const [amount, setAmount] = useState(defaults?.amount ? String(defaults.amount) : "");
  const [currency, setCurrency] = useState<"USD" | "MXN">(defaults?.currency ?? "USD");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvoiceId(defaults?.invoice_id ?? "");
    setAmount(defaults?.amount ? String(defaults.amount) : "");
    setCurrency(defaults?.currency ?? "USD");
    setGeneratedUrl(null);
    setError(null);
  }, [open, defaults]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!invoiceId.trim() || !parsed || parsed <= 0) {
      setError("Invoice and amount are required.");
      return;
    }
    if (defaults?.max_amount != null && parsed > defaults.max_amount + 0.001) {
      setError(`Amount cannot exceed remaining balance (${defaults.max_amount.toFixed(2)}).`);
      return;
    }
    try {
      const result = await createLink.mutateAsync({
        invoice_id: invoiceId.trim(),
        contact_id: defaults?.contact_id ?? null,
        amount: parsed,
        currency,
      });
      setGeneratedUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create link.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-[var(--card)] border border-[var(--card-border)] p-6 space-y-4">
        <h2 className="text-lg font-semibold">Generate payment link</h2>

        {generatedUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-body-muted">Share this link with your customer:</p>
            <input className="input-field w-full text-xs" readOnly value={generatedUrl} />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => void navigator.clipboard.writeText(generatedUrl)}
              >
                Copy link
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => void submit(e)}>
            <div>
              <label className="text-xs font-medium block mb-1">Invoice ID</label>
              <input
                className="input-field w-full"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="UUID"
                required
                readOnly={!!defaults?.invoice_id}
              />
            </div>
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
                    Up to {defaults.max_amount.toFixed(2)} — use a lower amount for installments
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
            {error && <p className="text-sm text-[var(--error)]">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLink.isPending}>
                Generate
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
