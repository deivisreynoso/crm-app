"use client";

import { Suspense, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/forms/ContactForm";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ListActions } from "@/components/ui/list-actions";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
} from "@/hooks/useContacts";

function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data as { error?: string } | undefined;
    return msg?.error ?? err.message;
  }
  return "Failed to delete contact.";
}
import { useCompanies } from "@/hooks/useCompanies";
import type { ContactFormInput } from "@/types";
import { formatDate } from "@/lib/utils";
import { formatApiError } from "@/lib/validation-errors";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { ContactsImportExport } from "@/components/contacts/contacts-import-export";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

function ContactsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialogProps } = useConfirmDialog();
  const presetCompanyId = searchParams.get("company_id") ?? searchParams.get("company") ?? "";
  const presetSearch = searchParams.get("search") ?? "";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(presetSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchInput, setSearchInput] = useState(presetSearch);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowForm(true);
    }
    const q = searchParams.get("search");
    if (q) {
      setSearch(q);
      setSearchInput(q);
    }
  }, [searchParams]);

  const { data, isLoading, error } = useContacts(page, 20, {
    search: search || undefined,
    status: statusFilter || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
  });
  const { data: companies = [] } = useCompanies();
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));
  const { canWrite } = useWorkspaceCapabilities();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();

  async function handleCreate(contact: ContactFormInput) {
    setCreateError(null);
    try {
      const payload = presetCompanyId
        ? { ...contact, company_id: presetCompanyId }
        : contact;
      const result = await createContact.mutateAsync(payload);
      setShowForm(false);
      router.refresh();
      const created = result.data;
      if (created?.id) {
        router.push(`/contacts/${created.id}`);
      }
    } catch (err) {
      setCreateError(formatApiError(err, "We could not create this contact. Please try again."));
      throw err;
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  const contacts = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-6 w-full">
      <ConfirmDialog {...dialogProps} />
      <PageHeader
        title="Contacts"
        description="Manage your customer relationships"
        actions={
          canWrite ? (
            <Button onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancel" : "Add Contact"}
            </Button>
          ) : undefined
        }
      />

      {showForm && (
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            New Contact
          </h2>
          <ContactForm
            defaultValues={
              presetCompanyId ? { company_id: presetCompanyId } : undefined
            }
            onSubmit={handleCreate}
            isLoading={createContact.isPending}
            submitLabel="Create Contact"
          />
          {createError && (
            <p className="text-sm text-red-600 mt-4 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {createError}
            </p>
          )}
        </div>
      )}

      <div className="surface-card p-4 space-y-3">
        {canWrite && (
        <ContactsImportExport
          filters={{
            search: search || undefined,
            status: statusFilter || undefined,
            createdFrom: createdFrom || undefined,
            createdTo: createdTo || undefined,
          }}
          onImported={() => {
            setPage(1);
            router.refresh();
          }}
        />
        )}
        <SavedFiltersBar
          entityType="contact"
          currentConfig={{
            ...(search ? { search } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(createdFrom ? { created_from: createdFrom } : {}),
            ...(createdTo ? { created_to: createdTo } : {}),
          }}
          onApply={(config) => {
            if (typeof config.search === "string") {
              setSearch(config.search);
              setSearchInput(config.search);
            } else {
              setSearch("");
              setSearchInput("");
            }
            setStatusFilter(typeof config.status === "string" ? config.status : "");
            setCreatedFrom(
              typeof config.created_from === "string" ? config.created_from : ""
            );
            setCreatedTo(
              typeof config.created_to === "string" ? config.created_to : ""
            );
            setPage(1);
          }}
        />
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="search"
            placeholder="Search by name, email, or company..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-4 py-2 border border-[var(--card-border)] rounded-md bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-[var(--card-border)] rounded-md bg-[var(--card)] text-[var(--foreground)]"
          >
            <option value="">All statuses</option>
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => {
              setCreatedFrom(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-[var(--card-border)] rounded-md bg-[var(--card)] text-[var(--foreground)]"
            aria-label="Created from"
            title="Created from"
          />
          <input
            type="date"
            value={createdTo}
            onChange={(e) => {
              setCreatedTo(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-[var(--card-border)] rounded-md bg-[var(--card)] text-[var(--foreground)]"
            aria-label="Created to"
            title="Created to"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      <DataTableShell
        isLoading={isLoading}
        empty={
          !isLoading && !error && contacts.length === 0
            ? "No contacts yet. Create your first contact to get started."
            : undefined
        }
      >
        {error ? (
          <p className="p-6 text-[var(--error)]">Failed to load contacts.</p>
        ) : contacts.length > 0 ? (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeadCell>Name</DataTableHeadCell>
                <DataTableHeadCell>Email</DataTableHeadCell>
                <DataTableHeadCell>Phone</DataTableHeadCell>
                <DataTableHeadCell>Account</DataTableHeadCell>
                <DataTableHeadCell>Title</DataTableHeadCell>
                <DataTableHeadCell>Created</DataTableHeadCell>
                <DataTableHeadCell>Status</DataTableHeadCell>
                <DataTableHeadCell align="right">Actions</DataTableHeadCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {contacts.map((contact) => (
                <DataTableRow key={contact.id}>
                  <DataTableCell>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-medium text-heading hover:underline"
                    >
                      {contact.first_name} {contact.last_name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">{contact.email || "—"}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">{contact.phone || "—"}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">
                      {contact.company_id
                        ? companyMap[contact.company_id] ?? "—"
                        : contact.company || "—"}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">{contact.title || "—"}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-body-muted">
                      {contact.created_at ? formatDate(contact.created_at) : "—"}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant="info">{contact.status}</Badge>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <ListActions
                      viewHref={`/contacts/${contact.id}`}
                      onDelete={canWrite ? async () => {
                        const ok = await confirm({
                          title: "Delete contact?",
                          description: `${contact.first_name} ${contact.last_name} will be permanently removed. This cannot be undone.`,
                          confirmLabel: "Delete contact",
                          destructive: true,
                        });
                        if (!ok) return;
                        try {
                          await deleteContact.mutateAsync(contact.id);
                        } catch (err: unknown) {
                          alert(apiErrorMessage(err));
                        }
                      } : undefined}
                      deleteDisabled={deleteContact.isPending}
                    />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </DataTableShell>

      {total > 0 && (
        <div className="flex items-center justify-between surface-card px-4 py-3">
            <p className="text-sm text-[var(--muted)]">
              {total} contact{total !== 1 ? "s" : ""} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-[var(--muted)] self-center">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<p className="text-[var(--muted)]">Loading contacts…</p>}>
      <ContactsPageContent />
    </Suspense>
  );
}
