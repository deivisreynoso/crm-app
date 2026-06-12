"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
  DataTableShell,
} from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useFinanceTransactions,
  useVoidFinanceTransaction,
  type FinanceTransactionFilters,
} from "@/hooks/useFinanceTransactions";
import { useInvoices } from "@/hooks/useFinances";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddTransactionModal } from "@/components/finances/add-transaction-modal";

type Props = {
  filters?: FinanceTransactionFilters;
  showAdd?: boolean;
};

export function TransactionsTab({ filters, showAdd = true }: Props) {
  const { canManage } = useWorkspaceCapabilities();
  const { data: rows = [], isLoading } = useFinanceTransactions(filters);
  const { data: invoices = [] } = useInvoices();
  const voidTx = useVoidFinanceTransaction();
  const [addOpen, setAddOpen] = useState(false);
  const [incomeType, setIncomeType] = useState<"income" | "expense">("income");

  async function handleVoid(id: string) {
    const reason = window.prompt("Reason for voiding this transaction?");
    if (!reason?.trim()) return;
    await voidTx.mutateAsync({ id, void_reason: reason.trim() });
  }

  const openInvoices = invoices.filter((i) => i.status !== "voided" && i.status !== "paid");

  return (
    <div className="space-y-4">
      {showAdd && canManage && (
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => { setIncomeType("expense"); setAddOpen(true); }}>
            Add expense
          </Button>
          <Button type="button" size="sm" onClick={() => { setIncomeType("income"); setAddOpen(true); }}>
            Log income
          </Button>
        </div>
      )}

      <DataTableShell
        isLoading={isLoading}
        empty={!isLoading && rows.length === 0 ? "No transactions yet." : undefined}
      >
        {rows.length > 0 && (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeadCell>Date</DataTableHeadCell>
                <DataTableHeadCell>Description</DataTableHeadCell>
                <DataTableHeadCell>Contact</DataTableHeadCell>
                <DataTableHeadCell>Invoice</DataTableHeadCell>
                <DataTableHeadCell>Quote</DataTableHeadCell>
                <DataTableHeadCell>Category</DataTableHeadCell>
                <DataTableHeadCell>Amount</DataTableHeadCell>
                <DataTableHeadCell>Status</DataTableHeadCell>
                {canManage && <DataTableHeadCell> </DataTableHeadCell>}
              </tr>
            </DataTableHead>
            <DataTableBody>
              {rows.map((tx) => {
                const isInbound = tx.direction === "inbound";
                return (
                  <DataTableRow key={tx.id}>
                    <DataTableCell>{formatDate(tx.transaction_date)}</DataTableCell>
                    <DataTableCell>{tx.description || "—"}</DataTableCell>
                    <DataTableCell>
                      {tx.contact ? (
                        <Link href={`/contacts/${tx.contact.id}`} className="text-[var(--secondary)] hover:underline">
                          {tx.contact.first_name} {tx.contact.last_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      {tx.invoice ? (
                        <Link
                          href={`/finances/invoices/${tx.invoice.id}`}
                          className="text-[var(--secondary)] hover:underline"
                        >
                          {tx.invoice.invoice_number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      {tx.quote?.quote_reference
                        ? `Quote ${tx.quote.quote_reference}`
                        : tx.invoice?.quote?.quote_reference
                          ? `Quote ${tx.invoice.quote.quote_reference}`
                          : "—"}
                    </DataTableCell>
                    <DataTableCell>{tx.category?.label ?? "—"}</DataTableCell>
                    <DataTableCell>
                      <span className={isInbound ? "text-emerald-700 font-medium" : "text-red-600 font-medium"}>
                        {isInbound ? "+" : "-"}
                        {formatCurrency(Number(tx.amount), tx.currency)}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={tx.status === "completed" ? "success" : "info"}>{tx.status}</Badge>
                    </DataTableCell>
                    {canManage && (
                      <DataTableCell>
                        {tx.status === "completed" && tx.type !== "adjustment" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={voidTx.isPending}
                            onClick={() => void handleVoid(tx.id)}
                          >
                            Void
                          </Button>
                        )}
                      </DataTableCell>
                    )}
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
      </DataTableShell>

      <AddTransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        invoices={openInvoices}
        defaults={{ type: incomeType }}
      />
    </div>
  );
}
