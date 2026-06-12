"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCreateQuoteService,
  useDeleteQuoteService,
  useQuoteServices,
  useUpdateQuoteService,
} from "@/hooks/useQuoteServices";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { formatCurrency } from "@/lib/utils";
import { formatApiError } from "@/lib/validation-errors";
import type { QuoteService } from "@/types";
import axios from "axios";

interface QuoteServicesCatalogProps {
  /** Owner/admin: edit prices and delete catalog entries */
  canManageCatalog?: boolean;
  readOnly?: boolean;
}

type BlockedQuote = {
  id: string;
  title: string | null;
  reference_number: string | null;
};

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
  const [deleteTarget, setDeleteTarget] = useState<QuoteService | null>(null);
  const [blockedQuotes, setBlockedQuotes] = useState<BlockedQuote[] | null>(null);
  const [editing, setEditing] = useState<QuoteService | null>(null);

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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError(null);
    setBlockedQuotes(null);
    try {
      await remove.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const data = err.response.data as {
          error?: string;
          quotes?: BlockedQuote[];
        };
        setBlockedQuotes(data.quotes ?? []);
        setError(
          data.error ??
            "This product is used on existing quotes and cannot be deleted."
        );
      } else {
        setError(formatApiError(err, "Could not delete service"));
      }
      setDeleteTarget(null);
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
      {blockedQuotes && blockedQuotes.length > 0 && (
        <div className="text-sm text-[var(--error)] border border-[var(--error)]/30 rounded-lg p-3 space-y-1">
          <p className="font-medium">Used on these quotes:</p>
          <ul className="list-disc list-inside">
            {blockedQuotes.map((q) => (
              <li key={q.id}>
                {q.reference_number ? `${q.reference_number} — ` : ""}
                {q.title ?? "Untitled quote"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {services.length === 0 ? (
        <p className="text-sm text-body-muted">{s?.noServices ?? "No services yet."}</p>
      ) : (
        <ul className="divide-y divide-[var(--card-border)] border border-[var(--card-border)] rounded-lg">
          {services.map((svc) => (
            <ServiceRow
              key={svc.id}
              service={svc}
              canManageCatalog={canManageCatalog && !readOnly}
              onEdit={() => setEditing(svc)}
              onDelete={() => {
                setBlockedQuotes(null);
                setError(null);
                setDeleteTarget(svc);
              }}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={s?.deleteConfirmTitle ?? "Delete product?"}
        description={
          deleteTarget
            ? `Remove "${deleteTarget.name}" from the catalog? This cannot be undone.`
            : ""
        }
        confirmLabel={s?.delete ?? "Delete"}
        destructive
        loading={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {editing && (
        <EditServiceModal
          service={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ServiceRow({
  service,
  canManageCatalog,
  onEdit,
  onDelete,
}: {
  service: QuoteService;
  canManageCatalog: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { dict } = useCrmLocale();
  const s = dict.services;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
      <div>
        <span className="font-medium text-heading">{service.name}</span>
        {service.description && (
          <span className="text-body-muted ml-2">{service.description}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-body-muted">
          {formatCurrency(service.unit_price, service.currency)}
        </span>
        {canManageCatalog && (
          <>
            <button
              type="button"
              className="text-body-muted hover:text-heading p-1"
              aria-label={s?.edit ?? "Edit"}
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="text-[var(--error)] text-xs"
              onClick={onDelete}
            >
              {s?.delete ?? "Delete"}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function EditServiceModal({
  service,
  onClose,
  onSaved,
}: {
  service: QuoteService;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { dict } = useCrmLocale();
  const s = dict.services;
  const update = useUpdateQuoteService(service.id);
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description ?? "");
  const [unitPrice, setUnitPrice] = useState(String(service.unit_price));
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        name: name.trim(),
        description: description.trim() || "",
        unit_price: Number(unitPrice) || 0,
      });
      onSaved();
    } catch (err) {
      setError(formatApiError(err, "Could not update service"));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-lg w-full max-w-md p-6 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-service-title"
      >
        <h2 id="edit-service-title" className="text-lg font-semibold text-heading">
          {s?.editService ?? "Edit product"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input-field w-full"
            placeholder={s?.namePlaceholder ?? "Service name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input-field w-full"
            type="number"
            min="0"
            step="0.01"
            placeholder={s?.pricePlaceholder ?? "Unit price"}
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
          />
          <textarea
            className="input-field w-full min-h-[80px]"
            placeholder={s?.descriptionPlaceholder ?? "Description (optional)"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && <p className="text-sm text-[var(--error)]">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {dict.actions?.cancel ?? "Cancel"}
            </Button>
            <Button type="submit" size="sm" disabled={update.isPending}>
              {update.isPending ? (s?.saving ?? "Saving…") : (dict.actions?.save ?? "Save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
