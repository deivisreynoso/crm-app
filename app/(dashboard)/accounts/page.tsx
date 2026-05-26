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
import { ListActions } from "@/components/ui/list-actions";
import { INDUSTRIES } from "@/lib/constants/industries";
import { useCompanies, useCreateCompany, useDeleteCompany } from "@/hooks/useCompanies";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const { data: companies = [], isLoading } = useCompanies({
    search: search || undefined,
    industry: industryFilter || undefined,
  });
  const { canWrite } = useWorkspaceCapabilities();
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const { confirm, dialogProps } = useConfirmDialog();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createCompany.mutateAsync({
      name: name.trim(),
      website: website || undefined,
      industry: industry || undefined,
    });
    setName("");
    setWebsite("");
    setIndustry("");
    setModalOpen(false);
  }

  return (
    <div className="space-y-6 w-full">
      <ConfirmDialog {...dialogProps} />
      <PageHeader
        title="Accounts"
        description="Companies you do business with — parent of contacts, service tickets, and deals"
        actions={
          canWrite ? (
            <Button size="sm" onClick={() => setModalOpen(true)}>
              New account
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 items-center">
        <SavedFiltersBar
          entityType="account"
          currentConfig={{
            ...(search ? { search } : {}),
            ...(industryFilter ? { industry: industryFilter } : {}),
          }}
          onApply={(config) => {
            setSearch(typeof config.search === "string" ? config.search : "");
            setIndustryFilter(
              typeof config.industry === "string" ? config.industry : ""
            );
          }}
        />
        <input
          type="search"
          placeholder="Search accounts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field min-w-[200px]"
        />
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="input-field min-w-[160px]"
        >
          <option value="">All industries</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

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
                <DataTableHeadCell>Website</DataTableHeadCell>
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
                    <span className="text-body-muted">{c.website || "—"}</span>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <ListActions
                      viewHref={`/accounts/${c.id}`}
                      onDelete={canWrite ? async () => {
                        const ok = await confirm({
                          title: "Delete account?",
                          description: `“${c.name}” will be permanently removed. Linked contacts will be unlinked.`,
                          confirmLabel: "Delete account",
                          destructive: true,
                        });
                        if (!ok) return;
                        await deleteCompany.mutateAsync(c.id);
                      } : undefined}
                    />
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
            <FormLabel>Industry</FormLabel>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="input-field"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FormLabel>Website</FormLabel>
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
