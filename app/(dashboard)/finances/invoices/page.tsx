import { Suspense } from "react";
import { InvoicesTable } from "@/components/finances/invoices-table";

export default function FinancesInvoicesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-body-muted">Loading invoices…</p>}>
      <InvoicesTable />
    </Suspense>
  );
}
