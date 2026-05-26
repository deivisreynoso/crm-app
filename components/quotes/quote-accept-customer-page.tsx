"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PublicQuoteView } from "@/lib/quotes/load-public-quote";

export function QuoteAcceptCustomerPage({ token }: { token: string }) {
  const [quote, setQuote] = useState<PublicQuoteView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"accept" | "reject" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get<{ data: PublicQuoteView }>(
          `/api/quotes/public/${encodeURIComponent(token)}`
        );
        if (!cancelled) setQuote(data.data);
      } catch {
        if (!cancelled) setError("This quote link is invalid or has expired.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function respond(action: "accept" | "reject") {
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/quotes/public/${encodeURIComponent(token)}`, {
        action,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      });
      setDone(action);
      setQuote((q) =>
        q
          ? {
              ...q,
              status: action === "accept" ? "accepted" : "rejected",
              accepted_at: action === "accept" ? new Date().toISOString() : q.accepted_at,
              rejected_at: action === "reject" ? new Date().toISOString() : q.rejected_at,
            }
          : q
      );
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not submit your response. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading quote…</p>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <p className="text-red-600 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (!quote) return null;

  const alreadyResponded =
    done ||
    quote.status === "accepted" ||
    quote.status === "rejected" ||
    quote.accepted_at ||
    quote.rejected_at;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        {quote.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={quote.logo_url}
            alt=""
            className="max-h-14 mb-6 object-contain"
          />
        ) : quote.company_display_name ? (
          <p className="text-lg font-bold text-slate-900 mb-6">
            {quote.company_display_name}
          </p>
        ) : null}

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Quote
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-1">{quote.title}</h1>
        {quote.quote_reference && (
          <p className="text-sm text-slate-500 mt-1">Ref. {quote.quote_reference}</p>
        )}

        <ul className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
          {quote.line_items.map((line) => (
            <li key={line.id} className="flex justify-between gap-2">
              <span>
                {line.description} × {line.quantity}
              </span>
              <span className="font-medium">
                {formatCurrency(Number(line.line_total), quote.currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-4 border-t border-slate-200 text-right space-y-1 text-sm">
          <p>Subtotal: {formatCurrency(quote.subtotal, quote.currency)}</p>
          {quote.tax_rate > 0 && (
            <p>
              Tax ({quote.tax_rate}%):{" "}
              {formatCurrency(quote.tax_amount, quote.currency)}
            </p>
          )}
          <p className="text-lg font-bold text-slate-900">
            Total: {formatCurrency(quote.total_amount, quote.currency)}
          </p>
        </div>

        {quote.content && (
          <p className="mt-4 text-sm text-slate-600 whitespace-pre-wrap border-t pt-4">
            {quote.content}
          </p>
        )}

        {alreadyResponded ? (
          <div className="mt-8 p-4 rounded-lg bg-slate-50 text-center">
            <p className="font-semibold text-slate-900">
              {quote.status === "accepted" || done === "accept"
                ? "Thank you — this quote has been accepted."
                : "This quote has been declined."}
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Your name (optional)
              </label>
              <input
                className="input-field w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                className="input-field w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                className="flex-1"
                disabled={submitting}
                onClick={() => void respond("accept")}
              >
                Accept quote
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={submitting}
                onClick={() => void respond("reject")}
              >
                Decline
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
