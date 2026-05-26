"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { useCreateQuoteService, useQuoteServices } from "@/hooks/useQuoteServices";
import { lineTotal } from "@/lib/quotes/calculate-totals";
import { formatCurrency } from "@/lib/utils";
import { formatApiError } from "@/lib/validation-errors";
import axios from "axios";
import type { QuoteLineItemsDraft } from "@/lib/quotes/preview-draft";
import type { QuoteLineItem } from "@/types";

type DraftLine = {
  key: string;
  service_id?: string;
  quantity: string;
};

function newDraftLine(serviceId?: string): DraftLine {
  return { key: crypto.randomUUID(), service_id: serviceId, quantity: "1" };
}

const EMPTY_LINES: QuoteLineItem[] = [];

function draftLinesKey(lines: DraftLine[]): string {
  return lines.map((l) => `${l.key}:${l.service_id ?? ""}:${l.quantity}`).join("|");
}

interface QuoteLineItemsSectionProps {
  documentId: string;
  initialLines?: QuoteLineItem[];
  initialTaxRate?: number;
  currency?: string;
  onSaved?: () => void;
  /** Keeps quote preview in sync while editing (before Save line items). */
  onDraftChange?: (draft: QuoteLineItemsDraft) => void;
}

export function QuoteLineItemsSection({
  documentId,
  initialLines,
  initialTaxRate = 0,
  currency = "USD",
  onSaved,
  onDraftChange,
}: QuoteLineItemsSectionProps) {
  const serverLines = initialLines ?? EMPTY_LINES;
  const { dict } = useCrmLocale();
  const q = dict.quotes;
  const queryClient = useQueryClient();
  const { data: services = [] } = useQuoteServices();
  const createService = useCreateQuoteService();
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [taxRate, setTaxRate] = useState(String(initialTaxRate || 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const servicesById = useMemo(() => {
    return new Map(services.map((s) => [s.id, s]));
  }, [services]);

  const serverLinesKey = useMemo(
    () =>
      serverLines
        .map(
          (l) =>
            `${l.id}:${l.service_id ?? ""}:${l.quantity}:${l.sort_order}:${l.unit_price}`
        )
        .join("|"),
    [serverLines]
  );

  useEffect(() => {
    setLines(
      serverLines.map((l) => ({
        key: l.id,
        service_id: l.service_id ?? undefined,
        quantity: String(l.quantity),
      }))
    );
    setTaxRate(String(initialTaxRate || 0));
  }, [documentId, serverLinesKey, initialTaxRate, serverLines]);

  const subtotal = lines.reduce((sum, l) => {
    const q = Number(l.quantity) || 0;
    const p = l.service_id ? Number(servicesById.get(l.service_id)?.unit_price) || 0 : 0;
    return sum + lineTotal(q, p);
  }, 0);
  const rate = Number(taxRate) || 0;
  const taxAmount = Math.round(subtotal * (rate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const lastDraftKeyRef = useRef("");

  useEffect(() => {
    lastDraftKeyRef.current = "";
  }, [documentId, serverLinesKey]);

  useEffect(() => {
    if (!onDraftChange) return;

    const draftKey = `${draftLinesKey(lines)}|${rate}|${subtotal}|${taxAmount}|${total}|${services.length}`;
    if (draftKey === lastDraftKeyRef.current) return;
    lastDraftKeyRef.current = draftKey;

    const lineItems: QuoteLineItem[] = lines.map((l, idx) => {
      const svc = l.service_id ? servicesById.get(l.service_id) : undefined;
      const qty = Number(l.quantity) || 0;
      const unit = svc ? Number(svc.unit_price) || 0 : 0;
      const lt = lineTotal(qty, unit);
      return {
        id: l.key,
        document_id: documentId,
        user_id: "",
        service_id: l.service_id ?? null,
        description: svc?.name ?? "",
        quantity: qty,
        unit_price: unit,
        line_total: lt,
        sort_order: idx,
        created_at: "",
      };
    });
    onDraftChange({
      lineItems,
      subtotal,
      taxRate: rate,
      taxAmount,
      totalAmount: total,
    });
  }, [
    lines,
    rate,
    subtotal,
    taxAmount,
    total,
    services.length,
    servicesById,
    documentId,
    onDraftChange,
  ]);

  function addFromService(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    setLines((prev) => [...prev, newDraftLine(svc.id)]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = lines.map((l, idx) => ({
        service_id: l.service_id as string,
        quantity: Number(l.quantity) || 1,
        sort_order: idx,
      }));
      await axios.put(`/api/documents/${documentId}/line-items`, {
        tax_rate: Number(taxRate) || 0,
        line_items: payload,
      });
      await queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      onSaved?.();
    } catch (err) {
      setError(formatApiError(err, "Could not save line items"));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCatalogItem() {
    setError(null);
    try {
      const res = await createService.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        unit_price: Number(newPrice) || 0,
      });
      const created = res.data;
      setNewName("");
      setNewPrice("");
      setNewDesc("");
      addFromService(created.id);
    } catch (err) {
      setError(formatApiError(err, "Could not create catalog service"));
    }
  }

  const canSave =
    lines.length > 0 &&
    lines.every((l) => !!l.service_id) &&
    lines.every((l) => (Number(l.quantity) || 0) > 0);

  return (
    <div className="surface-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-heading">{q?.addProducts}</h3>
        {services.length > 0 && (
          <select
            className="input-field text-sm max-w-xs"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) addFromService(e.target.value);
              e.target.value = "";
            }}
            aria-label="Add from catalog"
          >
            <option value="">+ {q?.fromCatalog}</option>
            {services
              .filter((s) => s.active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatCurrency(s.unit_price, s.currency)}
                </option>
              ))}
          </select>
        )}
      </div>

      <div className="border border-[var(--card-border)] rounded-lg p-3 space-y-2 bg-[var(--card)]">
        <p className="text-xs font-medium text-heading">{q?.createCatalogItem}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="input-field"
            placeholder="Service name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="input-field"
            type="number"
            min="0"
            step="0.01"
            placeholder="Unit price"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={!newName.trim() || createService.isPending}
            onClick={() => void handleCreateCatalogItem()}
          >
            {createService.isPending ? "…" : q?.createAndAdd}
          </Button>
        </div>
        <input
          className="input-field"
          placeholder="Description (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {lines.length === 0 ? (
          <p className="text-sm text-body-muted">
            {q?.noLineItems}
          </p>
        ) : (
          lines.map((line, idx) => {
            const svc = line.service_id ? servicesById.get(line.service_id) : undefined;
            const unit = svc ? Number(svc.unit_price) || 0 : 0;
            const qty = Number(line.quantity) || 0;
            return (
          <div
            key={line.key}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border-b border-[var(--card-border)] pb-2"
          >
            <div className="sm:col-span-5">
              <label className="text-xs text-body-muted">{q?.catalogService}</label>
              <select
                className="input-field w-full"
                value={line.service_id ?? ""}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, service_id: e.target.value || undefined } : l))
                  )
                }
                required
              >
                <option value="">{q?.selectService}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatCurrency(s.unit_price, s.currency)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-body-muted">{q?.qty}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input-field w-full"
                value={line.quantity}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx ? { ...l, quantity: e.target.value } : l
                    )
                  )
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-body-muted">{q?.unit}</label>
              <div className="input-field w-full bg-[var(--background)] text-sm flex items-center">
                {svc ? formatCurrency(unit, svc.currency) : "—"}
              </div>
            </div>
            <div className="sm:col-span-2 text-sm text-heading pb-2">
              {formatCurrency(
                lineTotal(qty, unit),
                currency
              )}
            </div>
            <div className="sm:col-span-1 pb-2">
              <button
                type="button"
                className="text-xs text-[var(--error)]"
                onClick={() =>
                  setLines((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                {q?.remove}
              </button>
            </div>
          </div>
          );
        })
        )}
      </div>

      <div className="flex flex-wrap gap-4 items-end justify-between pt-2 border-t border-[var(--card-border)]">
        <div>
          <label className="text-xs text-body-muted block mb-1">{q?.taxRate}</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="input-field w-24"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />
        </div>
        <div className="text-sm text-right space-y-1">
          <p>{q?.subtotal}: {formatCurrency(subtotal, currency)}</p>
          {rate > 0 && (
            <p>
              {q?.tax}: {formatCurrency(taxAmount, currency)}
            </p>
          )}
          <p className="font-semibold text-heading">
            {q?.total}: {formatCurrency(total, currency)}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <Button type="button" size="sm" onClick={save} disabled={saving || !canSave}>
        {saving ? "…" : q?.saveLineItems}
      </Button>
    </div>
  );
}
