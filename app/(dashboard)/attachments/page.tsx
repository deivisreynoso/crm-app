"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-shell";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { ContactSearchCombobox } from "@/components/forms/contact-search-combobox";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";

export default function AttachmentsPage() {
  const { dict } = useCrmLocale();
  const att = dict.attachments;
  const a = dict.actions;
  const [modalOpen, setModalOpen] = useState(false);
  const [linkContactId, setLinkContactId] = useState("");

  const { data: files = [], isLoading } = useDocuments({
    kind: "attachments",
    resolve_file_urls: true,
  });
  const upload = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title={att?.title ?? "Attachments"}
        description={att?.description}
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            {att?.upload ?? "Upload file"}
          </Button>
        }
      />

      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-body-muted">…</p>
        ) : files.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-body-muted mb-4">{att?.noFiles}</p>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
              {att?.upload}
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--background)] border-b border-[var(--card-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-heading">File</th>
                <th className="text-right px-4 py-3 font-medium text-heading w-28">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {files.map((d) => (
                <tr key={d.id} className="hover:bg-[var(--sidebar-hover)]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-heading">{d.title}</p>
                    <p className="text-xs text-body-muted">
                      {d.file_name ?? "attachment"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/attachments/${d.id}`}
                        className="p-2 rounded-md hover:bg-[var(--sidebar-hover)] text-[var(--primary)]"
                        title={a?.edit ?? "Edit"}
                        aria-label={a?.edit ?? "Edit"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {d.file_url && (
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-md hover:bg-[var(--sidebar-hover)] text-[var(--primary)]"
                          title={a?.open ?? "Open"}
                          aria-label={a?.open ?? "Open"}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        className="p-2 rounded-md hover:bg-[var(--sidebar-hover)] text-[var(--error)]"
                        title={a?.delete ?? "Delete"}
                        aria-label={a?.delete ?? "Delete"}
                        onClick={() => deleteDoc.mutate(d.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={att?.upload}>
        <div className="space-y-4 mb-4">
          <ContactSearchCombobox
            value={linkContactId}
            onChange={setLinkContactId}
            required
          />
        </div>
        <DocumentUploadForm
          defaultContactId={linkContactId}
          onSubmit={async (meta, file) => {
            if (!linkContactId) return;
            await upload.mutateAsync({
              metadata: {
                ...meta,
                type: "attachment",
                contact_id: linkContactId,
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
