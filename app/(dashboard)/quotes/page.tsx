"use client";

import Link from "next/link";
import { Pencil, Trash2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-shell";
import { DocumentStatusBadge } from "@/components/ui/document-status-badge";
import { TemplateEditor } from "@/components/documents/template-editor";
import { useDocuments, useDeleteDocument } from "@/hooks/useDocuments";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

type Tab = "all" | "templates";

export default function QuotesPage() {
  const { dict } = useCrmLocale();
  const q = dict.quotes;
  const a = dict.actions;
  const [tab, setTab] = useState<Tab>("all");
  const { data: quotes = [], isLoading } = useDocuments({ kind: "quotes" });
  const deleteDoc = useDeleteDocument();

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title={q?.title ?? "Quotes"}
        description={q?.description}
        actions={
          tab === "all" ? (
            <Link href="/quotes/new">
              <Button size="sm">{q?.newQuote ?? "New quote"}</Button>
            </Link>
          ) : null
        }
      />

      <nav className="flex gap-4 border-b border-[var(--card-border)]">
        {(
          [
            { id: "all" as const, label: q?.allQuotes ?? "All quotes" },
            { id: "templates" as const, label: q?.templates ?? "Templates" },
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
        <div className="surface-card overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-body-muted">…</p>
          ) : quotes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-body-muted mb-4">{q?.noQuotes}</p>
              <Link href="/quotes/new">
                <Button variant="outline" size="sm">
                  {q?.newQuote}
                </Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--background)] border-b border-[var(--card-border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-heading">
                    {q?.item}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-heading">
                    {q?.status}
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-heading">
                    {q?.total}
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-heading w-28">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {quotes.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--sidebar-hover)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/quotes/${d.id}`}
                        className="font-medium text-[var(--primary)] hover:underline"
                      >
                        {d.title}
                      </Link>
                      <p className="text-xs text-body-muted capitalize mt-0.5">
                        {d.type}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-heading">
                      {d.total_amount != null && Number(d.total_amount) > 0
                        ? formatCurrency(Number(d.total_amount))
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/quotes/${d.id}`}
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
                            <FileDown className="h-4 w-4" />
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
      )}
    </div>
  );
}
