"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useCreateQuoteService,
  useDeleteQuoteService,
  useQuoteServices,
  useUpdateQuoteService,
} from "@/hooks/useQuoteServices";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { formatCurrency } from "@/lib/utils";
import { formatApiError } from "@/lib/validation-errors";

interface QuoteServicesCatalogProps {
  /** Owner/admin: edit prices and delete catalog entries */
  canManageCatalog?: boolean;
  readOnly?: boolean;
}

export function QuoteServicesCatalog({
  canManageCatalog = false,
  readOnly = false,
}: QuoteServicesCatalogProps) {
  const { dict } = useCrmLocale();
  const s = dict.services;
  const { data: services = [], isLoading } = useQuoteServices();
  const create = useCreateQuoteService();
  const remove = useDeleteQuoteService();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canAdd = !readOnly;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        name: name.trim(),
        description: desc.trim() || undefined,
        unit_price: Number(price) || 0,
      });
      setName("");
      setPrice("");
      setDesc("");
    } catch (err) {
      setError(formatApiError(err, "Could not add service"));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-body-muted">{s?.loading ?? "Loading…"}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        {s?.catalogHelp ??
          "Services you add here appear when building quotes."}
      </p>

      {canAdd && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            className="input-field"
            placeholder={s?.namePlaceholder ?? "Service name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="number"
            min="0"
            step="0.01"
            placeholder={s?.pricePlaceholder ?? "Unit price"}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <input
            className="input-field sm:col-span-3"
            placeholder={s?.descriptionPlaceholder ?? "Description (optional)"}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="sm:col-span-3">
            <Button type="submit" size="sm" disabled={create.isPending}>
              {s?.addService ?? "Add service"}
            </Button>
          </div>
        </form>
      )}
      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      {services.length === 0 ? (
        <p className="text-sm text-body-muted">{s?.noServices ?? "No services yet."}</p>
      ) : (
        <ul className="divide-y divide-[var(--card-border)] border border-[var(--card-border)] rounded-lg">
          {services.map((svc) => (
            <ServiceRow
              key={svc.id}
              service={svc}
              canManageCatalog={canManageCatalog && !readOnly}
              onDelete={() => remove.mutate(svc.id)}
              deleting={remove.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  canManageCatalog,
  onDelete,
  deleting,
}: {
  service: {
    id: string;
    name: string;
    description?: string | null;
    unit_price: number;
    currency: string;
    active: boolean;
  };
  canManageCatalog: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { dict } = useCrmLocale();
  const s = dict.services;
  const update = useUpdateQuoteService(service.id);
  const [price, setPrice] = useState(String(service.unit_price));

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
      <div>
        <span className="font-medium text-heading">{service.name}</span>
        {service.description && (
          <span className="text-body-muted ml-2">{service.description}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {canManageCatalog ? (
          <>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field w-24 text-sm"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() => {
                const n = Number(price);
                if (n !== service.unit_price) {
                  void update.mutateAsync({ unit_price: n });
                }
              }}
            />
            <span className="text-body-muted">
              {formatCurrency(service.unit_price, service.currency)}
            </span>
            <button
              type="button"
              className="text-[var(--error)] text-xs"
              disabled={deleting}
              onClick={onDelete}
            >
              {s?.delete ?? "Delete"}
            </button>
          </>
        ) : (
          <span className="text-body-muted">
            {formatCurrency(service.unit_price, service.currency)}
          </span>
        )}
      </div>
    </li>
  );
}
