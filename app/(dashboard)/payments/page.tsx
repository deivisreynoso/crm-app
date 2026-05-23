"use client";

import Link from "next/link";
import {
  PageHeader,
  DataTableShell,
  DataTable,
  DataTableHead,
  DataTableHeadCell,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { usePayments } from "@/hooks/usePayments";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PaymentsPage() {
  const { data: payments = [], isLoading } = usePayments();

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Payments"
        description="Payment records linked to contacts and opportunities (Stripe-ready)"
      />

      <DataTableShell
        isLoading={isLoading}
        empty={
          !isLoading && payments.length === 0
            ? "No payments recorded yet. Payments can be created via Stripe webhooks or manual entry in a future update."
            : undefined
        }
      >
        {payments.length > 0 && (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeadCell>Date</DataTableHeadCell>
                <DataTableHeadCell>Amount</DataTableHeadCell>
                <DataTableHeadCell>Status</DataTableHeadCell>
                <DataTableHeadCell>Contact</DataTableHeadCell>
                <DataTableHeadCell>Opportunity</DataTableHeadCell>
                <DataTableHeadCell>Method</DataTableHeadCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {payments.map((p) => (
                <DataTableRow key={p.id}>
                  <DataTableCell>
                    <span className="text-body-muted">{formatDate(p.created_at)}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="font-medium text-heading">
                      {formatCurrency(Number(p.amount), p.currency)}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant="info">{p.status}</Badge>
                  </DataTableCell>
                  <DataTableCell>
                    {p.contact ? (
                      <Link
                        href={`/contacts/${p.contact.id}`}
                        className="text-[var(--secondary)] hover:underline"
                      >
                        {p.contact.first_name} {p.contact.last_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    {p.opportunity ? (
                      <Link
                        href="/opportunities"
                        className="text-[var(--secondary)] hover:underline"
                      >
                        {p.opportunity.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">{p.payment_method || "—"}</span>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </DataTableShell>
    </div>
  );
}
