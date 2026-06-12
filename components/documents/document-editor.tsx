"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FileDown, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/ui/document-status-badge";
import { VariablePalette } from "@/components/documents/variable-palette";
import { DocumentVersionHistory } from "@/components/documents/document-version-history";
import { QuoteLineItemsSection } from "@/components/documents/quote-line-items-section";
import { QuotePreview } from "@/components/documents/quote-preview";
import { QuoteAcceptLinkPanel } from "@/components/documents/quote-accept-link-panel";
import { SendQuoteEmailModal } from "@/components/documents/send-quote-email-modal";
import { insertAtTextareaCursor } from "@/lib/documents/insert-at-cursor";
import {
  useDocument,
  useGenerateDocumentPdf,
  useUpdateDocument,
} from "@/hooks/useDocument";
import { useContact } from "@/hooks/useContacts";
import { ContactSearchCombobox } from "@/components/forms/contact-search-combobox";
import { useCompanies } from "@/hooks/useCompanies";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import {
  buildTemplateContext,
  interpolateTemplate,
} from "@/lib/documents/template-variables";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import type { QuoteLineItemsDraft } from "@/lib/quotes/preview-draft";
import { isQuoteDocument } from "@/lib/documents/kinds";
import { formatApiError } from "@/lib/validation-errors";
import type { CrmDocument, QuoteLineItem } from "@/types";

const EMPTY_QUOTE_LINE_ITEMS: QuoteLineItem[] = [];

interface DocumentEditorProps {
  documentId: string;
  mode?: "quote" | "attachment" | "auto";
}

export function DocumentEditor({ documentId, mode = "auto" }: DocumentEditorProps) {
  const { dict } = useCrmLocale();
  const { canWrite, isDemoViewer } = useWorkspaceCapabilities();
  const q = dict.quotes;
  const actions = dict.actions;
  const readOnly = isDemoViewer || !canWrite;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { data: doc, isLoading, error } = useDocument(documentId);
  const updateDoc = useUpdateDocument(documentId);
  const generatePdf = useGenerateDocumentPdf(documentId);
  const { data: companies = [] } = useCompanies();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contactId, setContactId] = useState("");
  const { data: linkedContact } = useContact(contactId);
  const [footerHtml, setFooterHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok?: boolean } | null>(null);
  const { data: workspaceSettings } = useWorkspaceSettings();
  const currency = workspaceSettings?.default_currency ?? "USD";
  const [validUntil, setValidUntil] = useState("");
  const [lineItemsDraft, setLineItemsDraft] = useState<QuoteLineItemsDraft | null>(
    null
  );

  const linkedCompany = companies.find(
    (co) => co.id === (linkedContact?.company_id ?? doc?.company_id)
  );

  const previewDoc = useMemo(() => {
    if (!doc) return null;
    const base = {
      ...doc,
      title,
      content,
      footer_html: footerHtml.trim() ? footerHtml : null,
      contact_id: contactId || undefined,
      valid_until: validUntil || undefined,
    };
    if (!lineItemsDraft) return base;
    return {
      ...base,
      line_items: lineItemsDraft.lineItems,
      subtotal: lineItemsDraft.subtotal,
      tax_rate: lineItemsDraft.taxRate,
      tax_amount: lineItemsDraft.taxAmount,
      total_amount: lineItemsDraft.totalAmount,
    };
  }, [
    doc,
    title,
    content,
    footerHtml,
    contactId,
    validUntil,
    lineItemsDraft,
  ]);

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

  const isQuoteDoc =
    mode === "quote" ||
    (mode === "auto" && doc ? isQuoteDocument(doc.type) : false);

  const loadedDocIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!doc) return;
    if (loadedDocIdRef.current === doc.id) return;
    loadedDocIdRef.current = doc.id;
    setTitle(doc.title);
    setContent(doc.content ?? "");
    setContactId(doc.contact_id ?? "");
    setFooterHtml(doc.footer_html ?? "");
    setValidUntil(doc.valid_until ?? "");
    setLineItemsDraft(null);
  }, [doc]);

  if (isLoading) {
    return <p className="text-body-muted text-sm">Loading document…</p>;
  }

  if (error || !doc) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--error)]">Document not found.</p>
        <Link href="/quotes" className="text-sm text-[var(--primary)] hover:underline">
          ← {q?.title ?? "Quotes"}
        </Link>
      </div>
    );
  }

  /** Empty strings must be sent explicitly — `undefined` is omitted from JSON and skips clearing DB fields. */
  function textField(value: string) {
    return value;
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

  if (doc && isQuoteDoc) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[520px] -m-6 lg:-m-8">
        <header className="shrink-0 flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3 border-b border-[var(--card-border)] bg-[var(--card)]">
          <Link
            href="/quotes"
            className="text-xs text-body-muted hover:text-[var(--primary)]"
          >
            ← {q?.title ?? "Quotes"}
          </Link>
          <input
            className="flex-1 min-w-[12rem] text-lg font-semibold text-heading bg-transparent border-0 focus:outline-none disabled:opacity-80"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => !readOnly && title !== doc.title && void save({ title })}
            disabled={readOnly}
            readOnly={readOnly}
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
            {canWrite && (
            <Button
              variant="outline"
              size="sm"
              disabled={updateDoc.isPending}
              onClick={() =>
                void save({
                  title,
                  content,
                  contact_id: contactId || undefined,
                  valid_until: validUntil || undefined,
                  footer_html: textField(footerHtml),
                })
              }
            >
              {actions?.save ?? "Save"}
            </Button>
            )}
            {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSendEmailOpen(true)}
            >
              <Mail className="h-4 w-4 mr-1.5" />
              Send via email
            </Button>
            )}
            {canWrite && (
            <Button
              size="sm"
              disabled={generatePdf.isPending}
              onClick={async () => {
                try {
                  await save({
                    title,
                    content,
                    contact_id: contactId || undefined,
                    valid_until: validUntil || undefined,
                    footer_html: textField(footerHtml),
                  });
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
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto bg-[var(--background)] p-4 lg:p-6">
            <div className="max-w-2xl space-y-6">
              <section className="surface-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-heading">
                  {q?.customerInfo}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-heading block mb-1">
                      {q?.customer}
                    </label>
                    <ContactSearchCombobox
                      value={contactId}
                      onChange={(id) => {
                        if (readOnly) return;
                        setContactId(id);
                        void save({ contact_id: id || undefined });
                      }}
                      disabled={readOnly}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-heading block mb-1">
                      {q?.expiryDate}
                    </label>
                    <input
                      type="date"
                      className="input-field w-full"
                      value={validUntil ? validUntil.slice(0, 10) : ""}
                      disabled={readOnly}
                      readOnly={readOnly}
                      onChange={(e) => {
                        if (readOnly) return;
                        const next = e.target.value;
                        setValidUntil(next);
                      }}
                      onBlur={() =>
                        !readOnly &&
                        void save({ valid_until: validUntil || undefined })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-heading block mb-1">
                      {q?.status}
                    </label>
                    <select
                      className="input-field w-full"
                      value={doc.status}
                      disabled={readOnly}
                      onChange={(e) =>
                        !readOnly &&
                        void save({ status: e.target.value as CrmDocument["status"] })
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="signed">Signed</option>
                    </select>
                  </div>
                </div>
              </section>

              <QuoteLineItemsSection
                documentId={documentId}
                initialLines={doc.line_items ?? EMPTY_QUOTE_LINE_ITEMS}
                initialTaxRate={Number(doc.tax_rate) || 0}
                currency={currency}
                readOnly={readOnly}
                onDraftChange={setLineItemsDraft}
                onSaved={() => {
                  setLineItemsDraft(null);
                  setToast({ text: q?.servicesSaved ?? "Services saved", ok: true });
                }}
              />

              <QuoteAcceptLinkPanel doc={doc} readOnly={readOnly} />

              <section className="surface-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-heading">{q?.notes}</h3>
                <textarea
                  className="input-field w-full min-h-[96px]"
                  value={content}
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={() => !readOnly && void save({ content: textField(content) })}
                  placeholder={q?.messageToCustomer}
                />
              </section>

              <section className="surface-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-heading">
                  {q?.additionalOptions}
                </h3>
                <div>
                  <label className="text-xs font-medium text-heading block mb-1">
                    {q?.termsFooter}
                  </label>
                  <textarea
                    className="input-field w-full text-sm min-h-[80px]"
                    value={footerHtml}
                    readOnly={readOnly}
                    disabled={readOnly}
                    onChange={(e) => setFooterHtml(e.target.value)}
                    onBlur={() => !readOnly && void save({ footer_html: textField(footerHtml) })}
                    placeholder="Terms, payment details…"
                  />
                </div>
              </section>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto bg-[var(--background)] p-4 lg:p-6 border-t lg:border-t-0 lg:border-l border-[var(--card-border)]">
            <div className="mx-auto w-full max-w-2xl">
              <QuotePreview
                doc={previewDoc ?? doc}
                contact={linkedContact ?? null}
                company={linkedCompany ?? null}
                currency={currency}
                logoUrl={workspaceSettings?.quote_logo_url}
                companyDisplayName={workspaceSettings?.quote_company_name}
                labels={q}
              />
            </div>
          </div>
        </div>
        <SendQuoteEmailModal
          documentId={documentId}
          documentTitle={title}
          quoteReference={doc?.quote_reference}
          defaultTo={linkedContact?.email}
          contact={
            linkedContact
              ? {
                  id: linkedContact.id,
                  first_name: linkedContact.first_name,
                  last_name: linkedContact.last_name,
                  email: linkedContact.email,
                  phone: linkedContact.phone,
                  company: linkedContact.company,
                  company_id: linkedContact.company_id,
                }
              : null
          }
          companyName={linkedCompany?.name}
          open={sendEmailOpen}
          onClose={() => setSendEmailOpen(false)}
          onSent={() => {
            setToast({ text: "Quote sent via email", ok: true });
            void queryClient.invalidateQueries({ queryKey: ["document", documentId] });
            void queryClient.invalidateQueries({ queryKey: ["quote-analytics"] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[520px] -m-6 lg:-m-8">
      <header className="shrink-0 flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3 border-b border-[var(--card-border)] bg-[var(--card)]">
        <Link
          href="/attachments"
          className="text-xs text-body-muted hover:text-[var(--primary)]"
        >
          ← {dict.attachments?.title ?? "Attachments"}
        </Link>
        <input
          className="flex-1 min-w-[12rem] text-lg font-semibold text-heading bg-transparent border-0 focus:outline-none disabled:opacity-80"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => !readOnly && title !== doc.title && void save({ title })}
          disabled={readOnly}
          readOnly={readOnly}
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
          {canWrite && (
          <Button
            variant="outline"
            size="sm"
            disabled={updateDoc.isPending}
            onClick={() =>
              void save({
                content,
                title,
                contact_id: contactId || undefined,
                footer_html: textField(footerHtml),
              })
            }
          >
            {actions?.save ?? "Save"}
          </Button>
          )}
          {canWrite && (
          <Button
            size="sm"
            disabled={generatePdf.isPending}
            onClick={async () => {
              try {
                await save({
                  content,
                  title,
                  contact_id: contactId || undefined,
                  footer_html: textField(footerHtml),
                });
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
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-64 shrink-0 border-r border-[var(--card-border)] bg-[var(--background)] p-4 overflow-y-auto space-y-4">
          {!readOnly && <VariablePalette onInsert={insertVariable} />}
          <div>
            <label className="text-[10px] font-semibold uppercase text-body-muted block mb-1">
              Link contact (for autofill)
            </label>
            <ContactSearchCombobox
              value={contactId}
              onChange={(id) => {
                if (readOnly) return;
                setContactId(id);
                void save({ contact_id: id || undefined });
              }}
              disabled={readOnly}
              label="Contact"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-body-muted mb-2">
              Version history
            </p>
            <DocumentVersionHistory
              documentId={documentId}
              onRestore={
                readOnly
                  ? undefined
                  : (text) => {
                      setContent(text);
                      void save({ content: text });
                    }
              }
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
                readOnly={readOnly}
                disabled={readOnly}
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
