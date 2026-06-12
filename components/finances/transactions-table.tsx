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
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddTransactionModal } from "@/components/finances/add-transaction-modal";

type Props = {
  filters?: FinanceTransactionFilters;
  showAdd?: boolean;
};

export function TransactionsTable({ filters, showAdd = true }: Props) {
  const { canManage } = useWorkspaceCapabilities();
  const { data: rows = [], isLoading } = useFinanceTransactions(filters);
  const voidTx = useVoidFinanceTransaction();
  const [addOpen, setAddOpen] = useState(false);

  async function handleVoid(id: string) {
    const reason = window.prompt("Reason for voiding this transaction?");
    if (!reason?.trim()) return;
    await voidTx.mutateAsync({ id, void_reason: reason.trim() });
  }

  return (
    <div className="space-y-4">
      {showAdd && canManage && (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            Add transaction
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
                <DataTableHeadCell>Category</DataTableHeadCell>
                <DataTableHeadCell>Source</DataTableHeadCell>
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
                    <DataTableCell>{tx.category?.label ?? "—"}</DataTableCell>
                    <DataTableCell>
                      <span className="text-body-muted">{tx.source}</span>
                    </DataTableCell>
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

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
