"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-shell";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { TemplateEditor } from "@/components/documents/template-editor";
import { DocumentStatusBadge } from "@/components/ui/document-status-badge";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";

type Tab = "all" | "templates";

export default function DocumentsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [linkContactId, setLinkContactId] = useState("");
  const [linkCompanyId, setLinkCompanyId] = useState("");

  const { data: documents = [], isLoading } = useDocuments();
  const upload = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const { data: contactsData } = useContacts(1, 200);
  const { data: companies = [] } = useCompanies();

  const estimates = documents.filter(
    (d) => d.type === "estimate" || d.type === "proposal" || d.type === "contract"
  );

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Documents & estimates"
        description="Upload files, manage templates, generate PDFs, and send to contacts"
        actions={
          tab === "all" ? (
            <div className="flex gap-2">
              <Link href="/documents/new">
                <Button size="sm">New document</Button>
              </Link>
              <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                Upload file
              </Button>
            </div>
          ) : null
        }
      />

      <nav className="flex gap-4 border-b border-[var(--card-border)]">
        {(
          [
            { id: "all" as const, label: "All documents" },
            { id: "templates" as const, label: "Templates" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-[var(--secondary)] text-[var(--primary)]"
                : "border-transparent text-body-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "templates" ? (
        <TemplateEditor />
      ) : (
        <>
          {estimates.length > 0 && (
            <p className="text-sm text-body-muted">
              {estimates.length} estimate/proposal/contract document
              {estimates.length === 1 ? "" : "s"}
            </p>
          )}
          <div className="surface-card overflow-hidden">
            {isLoading ? (
              <p className="p-6 text-body-muted">Loading…</p>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-body-muted mb-2">No documents yet</p>
                <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                  Upload files
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--background)] border-b border-[var(--card-border)]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-heading">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-heading">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-heading">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-heading">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {documents.map((d) => (
                    <tr key={d.id} className="hover:bg-[var(--sidebar-hover)]">
                      <td className="px-4 py-3 font-medium text-heading">
                        <Link
                          href={`/documents/${d.id}`}
                          className="text-[var(--primary)] hover:underline"
                        >
                          {d.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize text-body-muted">{d.type}</td>
                      <td className="px-4 py-3">
                        <DocumentStatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3 text-right space-x-3">
                        <Link
                          href={`/documents/${d.id}`}
                          className="text-sm text-[var(--primary)] hover:underline"
                        >
                          Edit
                        </Link>
                        {d.file_url && (
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[var(--primary)] hover:underline"
                          >
                            Open
                          </a>
                        )}
                        <button
                          type="button"
                          className="text-sm text-[var(--error)] hover:underline"
                          onClick={() => deleteDoc.mutate(d.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload document">
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-heading mb-1">
              Link to account
            </label>
            <select
              value={linkCompanyId}
              onChange={(e) => setLinkCompanyId(e.target.value)}
              className="input-field"
            >
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1">
              Link to contact
            </label>
            <select
              value={linkContactId}
              onChange={(e) => setLinkContactId(e.target.value)}
              className="input-field"
            >
              <option value="">—</option>
              {(contactsData?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DocumentUploadForm
          defaultContactId={linkContactId}
          defaultCompanyId={linkCompanyId}
          onSubmit={async (meta, file) => {
            await upload.mutateAsync({
              metadata: {
                ...meta,
                contact_id: linkContactId || undefined,
                company_id: linkCompanyId || undefined,
              },
              file,
            });
            setModalOpen(false);
          }}
          onCancel={() => setModalOpen(false)}
          isLoading={upload.isPending}
        />
      </Modal>
    </div>
  );
}
