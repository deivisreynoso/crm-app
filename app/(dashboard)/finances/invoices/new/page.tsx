"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CreateInvoiceWizard } from "@/components/finances/create-invoice-wizard";

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const presetQuoteId = searchParams.get("quote_id") ?? "";
  const presetContactId = searchParams.get("contact_id") ?? "";
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [presetQuoteId, presetContactId]);

  return (
    <div className="max-w-2xl space-y-4">
      <Link
        href="/finances/invoices"
        className="text-xs font-medium text-[var(--secondary)] hover:underline"
      >
        ← Invoices
      </Link>
      <CreateInvoiceWizard
        open={open}
        onClose={() => setOpen(false)}
        presetQuoteId={presetQuoteId || undefined}
        presetContactId={presetContactId || undefined}
      />
      {!open && (
        <p className="text-sm text-body-muted">
          Invoice creation closed.{" "}
          <button
            type="button"
            className="text-[var(--secondary)] hover:underline"
            onClick={() => setOpen(true)}
          >
            Open wizard again
          </button>
        </p>
      )}
    </div>
  );
}
