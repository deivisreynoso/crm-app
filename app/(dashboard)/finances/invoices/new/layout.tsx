import { Suspense } from "react";

export default function NewInvoiceLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="text-sm text-body-muted">Loading…</p>}>{children}</Suspense>;
}
