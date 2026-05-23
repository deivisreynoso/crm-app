"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/ui/document-status-badge";
import { VariablePalette } from "@/components/documents/variable-palette";
import { DocumentVersionHistory } from "@/components/documents/document-version-history";
import { insertAtTextareaCursor } from "@/lib/documents/insert-at-cursor";
import {
  useDocument,
  useGenerateDocumentPdf,
  useUpdateDocument,
} from "@/hooks/useDocument";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import {
  buildTemplateContext,
  interpolateTemplate,
} from "@/lib/documents/template-variables";
import { formatApiError } from "@/lib/validation-errors";
import type { CrmDocument } from "@/types";

interface DocumentEditorProps {
  documentId: string;
}

export function DocumentEditor({ documentId }: DocumentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: doc, isLoading, error } = useDocument(documentId);
  const updateDoc = useUpdateDocument(documentId);
  const generatePdf = useGenerateDocumentPdf(documentId);
  const { data: contactsData } = useContacts(1, 200);
  const contacts = contactsData?.data ?? [];
  const { data: companies = [] } = useCompanies();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contactId, setContactId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok?: boolean } | null>(null);

  const linkedContact = contacts.find((c) => c.id === contactId);
  const linkedCompany = companies.find(
    (co) => co.id === (linkedContact?.company_id ?? doc?.company_id)
  );

  const previewContent = useMemo(() => {
    const ctx = buildTemplateContext({
      contact: linkedContact
        ? {
            first_name: linkedContact.first_name,
            last_name: linkedContact.last_name,
            email: linkedContact.email ?? undefined,
            phone: linkedContact.phone ?? undefined,
            company: linkedContact.company ?? undefined,
          }
        : null,
      company: linkedCompany ? { name: linkedCompany.name } : null,
      document: { title, valid_until: doc?.valid_until ?? undefined },
    });
    return interpolateTemplate(content, ctx);
  }, [content, linkedContact, linkedCompany, title, doc?.valid_until]);

  const isUploadedFile =
    !!doc?.file_url &&
    (!doc.content || doc.mime_type?.includes("pdf") || doc.file_name?.endsWith(".pdf"));

  useEffect(() => {
    if (!doc) return;
    setTitle(doc.title);
    setContent(doc.content ?? "");
    setContactId(doc.contact_id ?? "");
  }, [doc]);

  if (isLoading) {
    return <p className="text-body-muted text-sm">Loading document…</p>;
  }

  if (error || !doc) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--error)]">Document not found.</p>
        <Link href="/documents" className="text-sm text-[var(--primary)] hover:underline">
          ← Documents
        </Link>
      </div>
    );
  }

  async function save(patch: Partial<CrmDocument>) {
    try {
      await updateDoc.mutateAsync(patch);
      setToast({ text: "Saved", ok: true });
    } catch (err) {
      setToast({ text: formatApiError(err, "Save failed"), ok: false });
    }
  }

  function insertVariable(name: string) {
    const token = `{{${name}}}`;
    if (textareaRef.current) {
      setContent(insertAtTextareaCursor(textareaRef.current, token));
    } else {
      setContent((c) => c + token);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const token = e.dataTransfer.getData("text/plain");
    if (!token) return;
    if (textareaRef.current) {
      setContent(insertAtTextareaCursor(textareaRef.current, token));
    } else {
      setContent((c) => c + token);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[520px] -m-6 lg:-m-8">
      <header className="shrink-0 flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3 border-b border-[var(--card-border)] bg-[var(--card)]">
        <Link
          href="/documents"
          className="text-xs text-body-muted hover:text-[var(--primary)]"
        >
          ← Documents
        </Link>
        <input
          className="flex-1 min-w-[12rem] text-lg font-semibold text-heading bg-transparent border-0 focus:outline-none"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== doc.title && void save({ title })}
        />
        <DocumentStatusBadge status={doc.status} />
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {toast && (
            <span
              className={`text-xs font-medium px-2 py-1 rounded-md ${
                toast.ok
                  ? "bg-emerald-600 text-white"
                  : "bg-red-500/10 text-[var(--error)]"
              }`}
            >
              {toast.text}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen((v) => !v)}
          >
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={updateDoc.isPending}
            onClick={() => void save({ content, title, contact_id: contactId || undefined })}
          >
            Save
          </Button>
          <Button
            size="sm"
            disabled={generatePdf.isPending}
            onClick={async () => {
              try {
                await save({ content, title, contact_id: contactId || undefined });
                const res = await generatePdf.mutateAsync();
                setToast({ text: `PDF ready: ${res.data.file_name}`, ok: true });
              } catch (err) {
                setToast({ text: formatApiError(err, "PDF failed"), ok: false });
              }
            }}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            Generate PDF
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-64 shrink-0 border-r border-[var(--card-border)] bg-[var(--background)] p-4 overflow-y-auto space-y-4">
          <VariablePalette onInsert={insertVariable} />
          <div>
            <label className="text-[10px] font-semibold uppercase text-body-muted block mb-1">
              Link contact (for autofill)
            </label>
            <select
              className="input-field text-xs w-full"
              value={contactId}
              onChange={(e) => {
                setContactId(e.target.value);
                void save({ contact_id: e.target.value || undefined });
              }}
            >
              <option value="">— None —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-body-muted mb-2">
              Version history
            </p>
            <DocumentVersionHistory
              documentId={documentId}
              onRestore={(text) => {
                setContent(text);
                void save({ content: text });
              }}
            />
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col bg-[var(--background)] p-4 lg:p-6 overflow-y-auto">
          {isUploadedFile && (
            <div className="mb-4 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-heading">
                <FileText className="h-4 w-4 text-[var(--primary)]" />
                <span>
                  Uploaded file: <strong>{doc.file_name ?? "Document"}</strong>
                </span>
              </div>
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Open original
                </a>
              )}
              <p className="w-full text-xs text-body-muted">
                Add {"{{variables}}"} in the content area below. They will merge when you
                generate a PDF or when n8n processes the document.
              </p>
            </div>
          )}

          {previewOpen ? (
            <div className="mx-auto w-full max-w-2xl space-y-3">
              {!contactId && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Link a contact on the left to preview merged variables.
                </p>
              )}
              <div
                className="bg-white shadow-[var(--shadow-md)] rounded-lg border border-[var(--card-border)] p-8 min-h-[400px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <h2 className="text-xl font-bold text-slate-900 mb-4">{title}</h2>
                <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans leading-relaxed">
                  {previewContent || "(No content yet)"}
                </pre>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto w-full max-w-2xl"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={handleDrop}
            >
              <textarea
                ref={textareaRef}
                className="w-full min-h-[440px] bg-white shadow-[var(--shadow-md)] rounded-lg border border-[var(--card-border)] p-8 text-sm text-slate-800 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[var(--secondary)]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write or paste your document. Drag variables from the left into the text…"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
