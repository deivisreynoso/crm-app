"use client";

import axios from "axios";
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
import { usePaymentLinks } from "@/hooks/useFinances";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { formatCurrency, formatDate } from "@/lib/utils";
export function PaymentLinksTable() {
  const { canManage } = useWorkspaceCapabilities();
  const { data: rows = [], isLoading, refetch } = usePaymentLinks();

  async function deactivate(id: string) {
    await axios.post(`/api/finances/payment-links/${id}/deactivate`);
    void refetch();
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body-muted">
        Payment links are created from an invoice. Open an invoice and use Payments &amp; collection.
      </p>

      <DataTableShell
        isLoading={isLoading}
        empty={!isLoading && rows.length === 0 ? "No payment links yet." : undefined}
      >
        {rows.length > 0 && (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeadCell>Created</DataTableHeadCell>
                <DataTableHeadCell>Contact</DataTableHeadCell>
                <DataTableHeadCell>Linked to</DataTableHeadCell>
                <DataTableHeadCell>Amount</DataTableHeadCell>
                <DataTableHeadCell>Status</DataTableHeadCell>
                <DataTableHeadCell> </DataTableHeadCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {rows.map((link) => (
                <DataTableRow key={link.id}>
                  <DataTableCell>{formatDate(link.created_at)}</DataTableCell>
                  <DataTableCell>
                    {link.contact
                      ? `${link.contact.first_name} ${link.contact.last_name}`
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    {link.invoice?.invoice_number
                      ? `Invoice ${link.invoice.invoice_number}`
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>{formatCurrency(Number(link.amount), link.currency)}</DataTableCell>
                  <DataTableCell>
                    <Badge variant={link.status === "paid" ? "success" : "info"}>
                      {link.status}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => copyUrl(link.url)}>
                        Copy
                      </Button>
                      {canManage && link.status === "active" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void deactivate(link.id)}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
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
