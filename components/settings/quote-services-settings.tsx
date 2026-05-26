"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useCreateQuoteService,
  useDeleteQuoteService,
  useQuoteServices,
  useUpdateQuoteService,
} from "@/hooks/useQuoteServices";
import { formatCurrency } from "@/lib/utils";
import { formatApiError } from "@/lib/validation-errors";

export function QuoteServicesSettings() {
  const { data: services = [], isLoading } = useQuoteServices();
  const create = useCreateQuoteService();
  const remove = useDeleteQuoteService();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

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
    return <p className="text-sm text-body-muted">Loading catalog…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        Services appear when building quotes so you can add line items quickly.
      </p>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          className="input-field"
          placeholder="Service name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="input-field"
          type="number"
          min="0"
          step="0.01"
          placeholder="Unit price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <input
          className="input-field sm:col-span-3"
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="sm:col-span-3">
          <Button type="submit" size="sm" disabled={create.isPending}>
            Add service
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      {services.length === 0 ? (
        <p className="text-sm text-body-muted">No services in catalog yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--card-border)] border border-[var(--card-border)] rounded-lg">
          {services.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              onDelete={() => remove.mutate(s.id)}
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
  onDelete,
  deleting,
}: {
  service: { id: string; name: string; description?: string | null; unit_price: number; currency: string; active: boolean };
  onDelete: () => void;
  deleting: boolean;
}) {
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
        <span className="text-body-muted">{formatCurrency(service.unit_price, service.currency)}</span>
        <button
          type="button"
          className="text-[var(--error)] text-xs"
          disabled={deleting}
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
