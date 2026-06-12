"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FormLabel } from "@/components/ui/form-label";
import { useInvoices } from "@/hooks/useFinances";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import type { CrmDocument } from "@/types";

export type AcceptedQuoteOption = {
  id: string;
  label: string;
  contact_id: string | null;
  total_amount: number;
  currency: string;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
};

type AcceptedQuoteSelectProps = {
  value: string;
  onChange: (quoteId: string, quote?: AcceptedQuoteOption | null) => void;
  disabled?: boolean;
  allowStandalone?: boolean;
  locked?: boolean;
  label?: string;
  id?: string;
};

export function AcceptedQuoteSelect({
  value,
  onChange,
  disabled,
  allowStandalone = true,
  locked = false,
  label = "Related quote",
  id = "quote-select",
}: AcceptedQuoteSelectProps) {
  const [quotes, setQuotes] = useState<CrmDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: invoices = [] } = useInvoices({ summary: true });
  const { data: workspaceSettings } = useWorkspaceSettings();
  const defaultCurrency = workspaceSettings?.default_currency ?? "USD";

  useEffect(() => {
    let cancelled = false;
    void axios
      .get<{ data: CrmDocument[] }>("/api/documents", {
        params: { billable: "1", limit: 200 },
      })
      .then((res) => {
        if (!cancelled) setQuotes(res.data.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const invoicedQuoteIds = useMemo(
    () =>
      new Set(
        invoices
          .filter((i) => i.status !== "voided" && i.quote_id)
          .map((i) => i.quote_id as string)
      ),
    [invoices]
  );

  const options: AcceptedQuoteOption[] = useMemo(() => {
    return quotes
      .filter((q) => !invoicedQuoteIds.has(q.id) || q.id === value)
      .map((q) => ({
        id: q.id,
        contact_id: q.contact_id ?? null,
        total_amount: Number(q.total_amount ?? 0),
        currency:
          (q as { currency?: string }).currency === "MXN"
            ? "MXN"
            : (q as { currency?: string }).currency === "USD"
              ? "USD"
              : defaultCurrency,
        tax_rate: Number(q.tax_rate ?? 0),
        tax_amount: Number(q.tax_amount ?? 0),
        subtotal: Number(q.subtotal ?? q.total_amount ?? 0),
        label: [q.quote_reference, q.title].filter(Boolean).join(" — ") || q.title,
      }));
  }, [quotes, invoicedQuoteIds, value, defaultCurrency]);

  function handleChange(next: string) {
    if (!next) {
      onChange("", null);
      return;
    }
    const opt = options.find((o) => o.id === next) ?? null;
    onChange(next, opt);
  }

  if (locked && value) {
    const opt = options.find((o) => o.id === value);
    return (
      <div>
        <FormLabel>{label}</FormLabel>
        <p className="text-sm text-heading font-medium py-2 px-3 rounded-lg bg-[var(--surface-subtle)] border border-[var(--card-border)]">
          {opt?.label ?? "Linked quote"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <select
        id={id}
        className="input-field w-full"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled || loading || locked}
      >
        {allowStandalone && (
          <option value="">
            {loading ? "Loading…" : "None — standalone invoice"}
          </option>
        )}
        {!allowStandalone && !value && (
          <option value="">{loading ? "Loading…" : "Select an accepted quote…"}</option>
        )}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {allowStandalone && !value && (
        <p className="text-xs text-body-muted mt-1">
          For retainers, change orders, or billing not tied to a quote.
        </p>
      )}
    </div>
  );
}
