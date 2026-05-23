"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormLabel } from "@/components/ui/form-label";
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
import { useCompanies, useCreateCompany, useDeleteCompany } from "@/hooks/useCompanies";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

export default function AccountsPage() {
  const { data: companies = [], isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const { confirm, dialogProps } = useConfirmDialog();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createCompany.mutateAsync({
      name: name.trim(),
      website: website || undefined,
    });
    setName("");
    setWebsite("");
    setModalOpen(false);
  }

  return (
    <div className="space-y-6 w-full">
      <ConfirmDialog {...dialogProps} />
      <PageHeader
        title="Accounts"
        description="Companies you do business with — parent of contacts, service tickets, and deals"
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            New account
          </Button>
        }
      />

      <DataTableShell
        isLoading={isLoading}
        loadingMessage="Loading accounts…"
        empty={
          !isLoading && companies.length === 0
            ? "No accounts yet. Create your first company account."
            : undefined
        }
      >
        {companies.length > 0 && (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeadCell>Account name</DataTableHeadCell>
                <DataTableHeadCell>Industry</DataTableHeadCell>
                <DataTableHeadCell>Phone</DataTableHeadCell>
                <DataTableHeadCell align="right">Actions</DataTableHeadCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {companies.map((c) => (
                <DataTableRow key={c.id}>
                  <DataTableCell>
                    <Link
                      href={`/accounts/${c.id}`}
                      className="font-medium text-[var(--secondary)] hover:underline"
                    >
                      {c.name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">{c.industry || "—"}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">{c.phone || "—"}</span>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <Link
                      href={`/accounts/${c.id}`}
                      className="text-[var(--primary)] hover:underline mr-3"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      className="text-[var(--error)] hover:underline"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Delete account?",
                          description: `“${c.name}” will be permanently removed. Linked contacts will be unlinked.`,
                          confirmLabel: "Delete account",
                          destructive: true,
                        });
                        if (!ok) return;
                        await deleteCompany.mutateAsync(c.id);
                      }}
                    >
                      Delete
                    </button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </DataTableShell>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New account">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
          <FormLabel required>Account name</FormLabel>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1">
              Website
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCompany.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
