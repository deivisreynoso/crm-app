"use client";

import { useState } from "react";
import { CreateInvoiceWizard } from "@/components/finances/create-invoice-wizard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Ban, Copy, FileDown, Mail, Trash2 } from "lucide-react";
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
import { useDuplicateInvoice, useDeleteInvoice, useInvoices } from "@/hooks/useFinances";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { useWorkspace } from "@/components/crm/workspace-provider";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "info" | "success" | "warning"> = {
  draft: "default",
  pending: "warning",
  partially_paid: "warning",
  sent: "info",
  viewed: "info",
  paid: "success",
  overdue: "warning",
  voided: "default",
};

function IconAction({
  label,
  icon: Icon,
  onClick,
  tone = "primary",
  disabled,
}: {
  label: string;
  icon: typeof Copy;
  onClick: () => void;
  tone?: "primary" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`p-2 rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none ${
        tone === "danger"
          ? "hover:bg-[var(--sidebar-hover)] text-[var(--error)]"
          : "hover:bg-[var(--sidebar-hover)] text-[var(--primary)]"
      }`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function InvoicesTable() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { canManage } = useWorkspaceCapabilities();
  const { ctx } = useWorkspace();
  const isOwner = ctx?.isWorkspaceOwner ?? false;
  const { data: rows = [], isLoading, refetch } = useInvoices(filter || undefined);
  const duplicateInvoice = useDuplicateInvoice();
  const deleteInvoice = useDeleteInvoice();

  async function downloadPdf(id: string) {
    const { data } = await axios.get<{ file_url: string }>(`/api/finances/invoices/${id}/pdf`);
    if (data.file_url) window.open(data.file_url, "_blank");
  }

  async function sendInvoice(id: string) {
    setBusyId(id);
    try {
      await axios.post(`/api/finances/invoices/${id}/send`, {});
      void refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function voidInvoice(id: string) {
    const ok = window.confirm("Void this invoice? This cannot be undone.");
    if (!ok) return;
    setBusyId(id);
    try {
      await axios.post(`/api/finances/invoices/${id}/void`);
      void refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteInvoiceRow(id: string, invoiceNumber: string) {
    const ok = window.confirm(
      `Permanently delete invoice ${invoiceNumber}? Related payment records will also be removed. This cannot be undone.`
    );
    if (!ok) return;
    setBusyId(id);
    try {
      await deleteInvoice.mutateAsync(id);
      void refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(id: string) {
    setBusyId(id);
    try {
      const copy = await duplicateInvoice.mutateAsync(id);
      router.push(`/finances/invoices/${copy.id}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["", "pending", "partially_paid", "draft", "sent", "overdue", "paid", "voided"].map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                filter === s
                  ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                  : "border-[var(--card-border)] text-body-muted"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-3 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
          >
            Create invoice
          </button>
        )}
      </div>

      <DataTableShell
        isLoading={isLoading}
        empty={!isLoading && rows.length === 0 ? "No invoices yet." : undefined}
      >
        {rows.length > 0 && (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeadCell>Invoice #</DataTableHeadCell>
                <DataTableHeadCell>Contact</DataTableHeadCell>
                <DataTableHeadCell>Status</DataTableHeadCell>
                <DataTableHeadCell>Total</DataTableHeadCell>
                <DataTableHeadCell>Due</DataTableHeadCell>
                <DataTableHeadCell>Sent</DataTableHeadCell>
                <DataTableHeadCell align="right">Actions</DataTableHeadCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {rows.map((inv) => {
                const isBusy = busyId === inv.id;
                const canVoid = canManage && !["paid", "voided"].includes(inv.status);
                const canDuplicate = canManage;

                return (
                  <DataTableRow key={inv.id}>
                    <DataTableCell>
                      <Link
                        href={`/finances/invoices/${inv.id}`}
                        className="font-medium text-[var(--secondary)] hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>
                      {inv.contact
                        ? `${inv.contact.first_name} ${inv.contact.last_name}`
                        : "—"}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={STATUS_VARIANT[inv.status] ?? "default"}>{inv.status}</Badge>
                    </DataTableCell>
                    <DataTableCell>{formatCurrency(Number(inv.total), inv.currency)}</DataTableCell>
                    <DataTableCell>{inv.due_date ? formatDate(inv.due_date) : "—"}</DataTableCell>
                    <DataTableCell>{inv.sent_at ? formatDate(inv.sent_at) : "—"}</DataTableCell>
                    <DataTableCell>
                      <div className="flex items-center justify-end gap-1">
                        <IconAction
                          label="Download PDF"
                          icon={FileDown}
                          disabled={isBusy}
                          onClick={() => void downloadPdf(inv.id)}
                        />
                        {canManage && inv.status === "draft" && (
                          <IconAction
                            label="Send invoice"
                            icon={Mail}
                            disabled={isBusy}
                            onClick={() => void sendInvoice(inv.id)}
                          />
                        )}
                        {canDuplicate && (
                          <IconAction
                            label="Duplicate"
                            icon={Copy}
                            disabled={isBusy || duplicateInvoice.isPending}
                            onClick={() => void duplicate(inv.id)}
                          />
                        )}
                        {canVoid && (
                          <IconAction
                            label="Void invoice"
                            icon={Ban}
                            tone="danger"
                            disabled={isBusy}
                            onClick={() => void voidInvoice(inv.id)}
                          />
                        )}
                        {isOwner && (
                          <IconAction
                            label="Delete invoice permanently"
                            icon={Trash2}
                            tone="danger"
                            disabled={isBusy || deleteInvoice.isPending}
                            onClick={() => void deleteInvoiceRow(inv.id, inv.invoice_number)}
                          />
                        )}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
      </DataTableShell>

      <CreateInvoiceWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
