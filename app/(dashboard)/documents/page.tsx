"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDocuments";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";

export default function DocumentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [linkContactId, setLinkContactId] = useState("");
  const [linkCompanyId, setLinkCompanyId] = useState("");

  const { data: documents = [], isLoading } = useDocuments();
  const upload = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const { data: contactsData } = useContacts(1, 200);
  const { data: companies = [] } = useCompanies();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-600 mt-1">
            Files attached to accounts, contacts, or opportunities
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Upload
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-600">Loading…</p>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 m-6 rounded-lg">
            <p className="text-slate-600 mb-2">No documents yet</p>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
              Upload files
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{d.title}</td>
                  <td className="px-4 py-3">{d.type}</td>
                  <td className="px-4 py-3">{d.status}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {d.file_url && (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline"
                      >
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload document">
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Link to account</label>
            <select
              value={linkCompanyId}
              onChange={(e) => setLinkCompanyId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
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
            <label className="block text-sm font-medium mb-1">Link to contact</label>
            <select
              value={linkContactId}
              onChange={(e) => setLinkContactId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
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
