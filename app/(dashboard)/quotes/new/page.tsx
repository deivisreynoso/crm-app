"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-shell";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import axios from "axios";
import { QUOTE_DOCUMENT_CREATE_TYPE } from "@/lib/documents/kinds";
import type { CrmDocument } from "@/types";
import { formatApiError } from "@/lib/validation-errors";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";

/** Create a draft quote immediately and open the editor — no intermediate form. */
export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact_id") ?? "";
  const companyId = searchParams.get("company_id") ?? "";
  const opportunityId = searchParams.get("opportunity_id") ?? "";
  const { dict } = useCrmLocale();
  const { canWrite } = useWorkspaceCapabilities();
  const q = dict.quotes;
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!canWrite || started.current) return;
    started.current = true;

    void (async () => {
      try {
        const { data } = await axios.post<CrmDocument>(
          "/api/documents",
          {
            title: q?.newQuote ?? "New quote",
            type: QUOTE_DOCUMENT_CREATE_TYPE,
            content: "",
            status: "draft",
            contact_id: contactId || undefined,
            company_id: companyId || undefined,
            opportunity_id: opportunityId || undefined,
          },
          { headers: { "Content-Type": "application/json" } }
        );
        router.replace(`/quotes/${data.id}`);
      } catch (err) {
        setError(formatApiError(err, "Could not create quote"));
        started.current = false;
      }
    })();
  }, [canWrite, contactId, companyId, opportunityId, router, q?.newQuote]);

  if (!canWrite) {
    return (
      <div className="max-w-lg space-y-4">
        <PageHeader title={q?.newQuote ?? "New quote"} description={q?.description} />
        <p className="text-sm text-body-muted">Your account has view-only access.</p>
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
    <div className="max-w-lg space-y-4">
      <PageHeader title={q?.newQuote ?? "New quote"} description={q?.description} />
      {error ? (
        <>
          <p className="text-sm text-[var(--error)] bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
          <Link
            href="/quotes"
            className="inline-flex items-center justify-center rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium text-heading hover:bg-[var(--sidebar-hover)]"
          >
            Back to quotes
          </Link>
        </>
      ) : (
        <p className="text-sm text-body-muted">Opening quote editor…</p>
      )}
    </div>
  );
}
