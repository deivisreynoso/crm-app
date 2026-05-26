"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-shell";
import { useDocumentTemplates } from "@/hooks/useDocumentTemplates";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import axios from "axios";
import { QUOTE_DOCUMENT_CREATE_TYPE } from "@/lib/documents/kinds";
import type { CrmDocument } from "@/types";
import { formatApiError } from "@/lib/validation-errors";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact_id") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const { dict } = useCrmLocale();
  const { canWrite } = useWorkspaceCapabilities();
  const q = dict.quotes;
  const { data: templates = [] } = useDocumentTemplates();
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const template = templates.find((t) => t.id === templateId);
      const { data } = await axios.post<CrmDocument>(
        "/api/documents",
        {
          title: title.trim() || (q?.newQuote ?? "New quote"),
          type: QUOTE_DOCUMENT_CREATE_TYPE,
          content: template?.content ?? "",
          status: "draft",
          contact_id: contactId || undefined,
          company_id: companyId || undefined,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      router.push(`/quotes/${data.id}`);
    } catch (err) {
      setError(formatApiError(err, "Could not create quote"));
    } finally {
      setLoading(false);
    }
  }

  if (!canWrite) {
    return (
      <div className="max-w-lg space-y-4">
        <PageHeader title={q?.newQuote ?? "New quote"} description={q?.description} />
        <p className="text-sm text-body-muted">
          Your account has view-only access.
        </p>
        <Link
          href="/quotes"
          className="inline-flex items-center justify-center rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium text-heading hover:bg-[var(--sidebar-hover)]"
        >
          Back to quotes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title={q?.newQuote ?? "New quote"} description={q?.description} />
      {error && (
        <p className="text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <form onSubmit={handleCreate} className="surface-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            {q?.quoteTitleLabel ?? "Title"}
          </label>
          <input
            className="input-field w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={q?.quoteTitlePlaceholder}
          />
          {q?.quoteTitleHint && (
            <p className="text-xs text-body-muted mt-1">{q.quoteTitleHint}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            {q?.templates}
          </label>
          <select
            className="input-field w-full"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">—</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <Link href="/quotes">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            Create
          </Button>
        </div>
      </form>
    </div>
  );
}
