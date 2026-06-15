"use client";

import { Suspense, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Search } from "lucide-react";
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
import type { ContactFormInput } from "@/types";
import { formatDate } from "@/lib/utils";
import { formatApiError } from "@/lib/validation-errors";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { SavedFiltersBar } from "@/components/filters/saved-filters-bar";
import { ListFiltersPanel } from "@/components/filters/list-filters-panel";
import { FilterField } from "@/components/filters/filter-field";
import { ContactsImportExport } from "@/components/contacts/contacts-import-export";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";

function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data as { error?: string } | undefined;
    return msg?.error ?? err.message;
  }
  return "Failed to delete contact.";
}

function ContactsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dict } = useCrmLocale();
  const ct = dict.contacts;
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
  const { canWrite, canManage } = useWorkspaceCapabilities();
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

  function clearFilters() {
    setSearch("");
    setSearchInput("");
    setStatusFilter("");
    setCreatedFrom("");
    setCreatedTo("");
    setPage(1);
  }

  const hasActiveFilters = Boolean(
    search || statusFilter || createdFrom || createdTo
  );

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

      <ListFiltersPanel
        gridClassName="list-filters-panel__grid--contacts"
        toolbar={
          canWrite ? (
            <ContactsImportExport
              compact
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
          ) : undefined
        }
        savedFilters={
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
        }
        resultCount={
          <span className="list-filters-panel__count">
            {total} contact{total !== 1 ? "s" : ""}
          </span>
        }
        showClear={hasActiveFilters}
        onClear={clearFilters}
      >
        <form onSubmit={handleSearch} className="contents">
          <FilterField label="Search" htmlFor="contact-search">
            <div className="filter-search-wrap">
              <Search className="filter-search-icon" aria-hidden />
              <input
                id="contact-search"
                type="search"
                placeholder="Name, email, or company…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="filter-input-compact"
              />
            </div>
          </FilterField>
          <FilterField label="Status" htmlFor="contact-status">
            <select
              id="contact-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="filter-input-compact"
            >
              <option value="">All statuses</option>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FilterField>
          <FilterField label="Created from" htmlFor="contact-created-from">
            <input
              id="contact-created-from"
              type="date"
              value={createdFrom}
              onChange={(e) => {
                setCreatedFrom(e.target.value);
                setPage(1);
              }}
              className="filter-input-compact"
            />
          </FilterField>
          <FilterField label="Created to" htmlFor="contact-created-to">
            <input
              id="contact-created-to"
              type="date"
              value={createdTo}
              onChange={(e) => {
                setCreatedTo(e.target.value);
                setPage(1);
              }}
              className="filter-input-compact"
            />
          </FilterField>
          <FilterField label="Apply" className="max-lg:col-span-full">
            <button type="submit" className="filter-submit-btn w-full lg:w-auto">
              Search
            </button>
          </FilterField>
        </form>
      </ListFiltersPanel>

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
                <DataTableHeadCell>{ct?.listName ?? "Name"}</DataTableHeadCell>
                <DataTableHeadCell>{ct?.listEmail ?? "Email"}</DataTableHeadCell>
                <DataTableHeadCell>{ct?.listPhone ?? "Phone"}</DataTableHeadCell>
                <DataTableHeadCell>{ct?.listCompany ?? "Companies"}</DataTableHeadCell>
                <DataTableHeadCell>{ct?.listTitle ?? "Title"}</DataTableHeadCell>
                <DataTableHeadCell>{ct?.listCreated ?? "Created"}</DataTableHeadCell>
                <DataTableHeadCell>{ct?.listStatus ?? "Status"}</DataTableHeadCell>
                <DataTableHeadCell align="right">{ct?.listActions ?? "Actions"}</DataTableHeadCell>
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
                      {contact.company || "—"}
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
                      onDelete={canManage ? async () => {
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
