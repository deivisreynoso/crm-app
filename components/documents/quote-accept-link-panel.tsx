"use client";

import { useEffect, useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCrmLocale } from "@/components/crm/crm-locale-provider";
import { formatQuoteDate } from "@/lib/crm/format-date";
import { formatCurrency } from "@/lib/utils";
import axios from "axios";
import type { CrmDocument } from "@/types";

export function QuoteAcceptLinkPanel({
  doc,
  readOnly,
}: {
  doc: CrmDocument;
  readOnly?: boolean;
}) {
  const { dict, locale } = useCrmLocale();
  const q = dict.quotes;
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = doc.accept_token?.trim();
    if (readOnly) {
      if (token) {
        setAcceptUrl(`${window.location.origin}/quote/${token}`);
      } else {
        setAcceptUrl(null);
      }
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.post<{ accept_url: string }>(
          `/api/documents/${doc.id}/accept-link`
        );
        if (!cancelled) setAcceptUrl(data.accept_url);
      } catch {
        if (!cancelled) setAcceptUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc.id, doc.accept_token, readOnly]);

  async function copyLink() {
    if (!acceptUrl) return;
    await navigator.clipboard.writeText(acceptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="surface-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-[var(--secondary)]" />
        <h3 className="text-sm font-semibold text-heading">
          {q?.customerAcceptance ?? "Customer acceptance"}
        </h3>
      </div>
      <p className="text-xs text-body-muted">
        {q?.customerAcceptanceHint ??
          "Share this link so your customer can accept or decline. Responses update quote status and contact activity."}
      </p>

      {doc.accepted_at && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {q?.acceptedOn ?? "Accepted"}{" "}
          {formatQuoteDate(doc.accepted_at, locale)}
          {doc.response_name ? ` — ${doc.response_name}` : ""}
        </p>
      )}
      {doc.rejected_at && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {q?.declinedOn ?? "Declined"}{" "}
          {formatQuoteDate(doc.rejected_at, locale)}
          {doc.response_name ? ` — ${doc.response_name}` : ""}
        </p>
      )}

      {doc.quote_payment?.status === "completed" && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {q?.paymentReceived ?? "Payment received"}{" "}
          {formatCurrency(Number(doc.quote_payment.amount), doc.quote_payment.currency ?? "USD")}
          {" · "}
          {formatQuoteDate(doc.quote_payment.created_at, locale)}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-body-muted">…</p>
      ) : acceptUrl ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            className="input-field flex-1 text-xs"
            value={acceptUrl}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            {copied ? (q?.linkCopied ?? "Copied") : (q?.copyLink ?? "Copy link")}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-[var(--error)]">
          {q?.acceptLinkError ?? "Could not generate acceptance link."}
        </p>
      )}
    </section>
  );
}
