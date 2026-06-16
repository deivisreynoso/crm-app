"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PublicQuoteView } from "@/lib/quotes/load-public-quote";
import { getQuoteAcceptCopy } from "@/lib/quotes/public-accept-copy";
import { PayNowSection } from "@/components/quotes/pay-now-section";

export function QuoteAcceptCustomerPage({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const paymentNotice = searchParams.get("payment");
  const [quote, setQuote] = useState<PublicQuoteView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [disclaimerAck, setDisclaimerAck] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [lossNotes, setLossNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"accept" | "reject" | null>(null);

  const copy = useMemo(
    () => getQuoteAcceptCopy(quote?.locale ?? "en"),
    [quote?.locale]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get<{ data: PublicQuoteView }>(
          `/api/quotes/public/${encodeURIComponent(token)}`
        );
        if (cancelled) return;
        setQuote(data.data);
        if (data.data.response_email) {
          setEmail(data.data.response_email);
        }
      } catch {
        if (!cancelled) setError(copy.invalid);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, copy.invalid]);

  async function respond(action: "accept" | "reject") {
    if (action === "accept") {
      if (!disclaimerAck) {
        setError(copy.disclaimerAck);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/quotes/public/${encodeURIComponent(token)}`, {
        action,
        name: name.trim(),
        email: email.trim(),
        disclaimer_acknowledged: action === "accept" ? true : undefined,
        loss_reason: action === "reject" ? lossReason || undefined : undefined,
        loss_reason_notes: action === "reject" ? lossNotes || undefined : undefined,
      });
      setDone(action);
      setQuote((q) =>
        q
          ? {
              ...q,
              status: action === "accept" ? "accepted" : "rejected",
              accepted_at: action === "accept" ? new Date().toISOString() : q.accepted_at,
              rejected_at: action === "reject" ? new Date().toISOString() : q.rejected_at,
              response_email: action === "accept" ? email.trim() : q.response_email,
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
        <p className="text-slate-600">{copy.loading}</p>
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

  const isAccepted =
    done === "accept" ||
    quote.status === "accepted" ||
    quote.status === "signed" ||
    Boolean(quote.accepted_at);

  const isRejected =
    done === "reject" ||
    quote.status === "rejected" ||
    Boolean(quote.rejected_at);

  const alreadyResponded = isAccepted || isRejected;
  const isExpired = quote.is_expired && !alreadyResponded;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        {quote.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={quote.logo_url} alt="" className="max-h-14 mb-6 object-contain" />
        ) : quote.company_display_name ? (
          <p className="text-lg font-bold text-slate-900 mb-6">{quote.company_display_name}</p>
        ) : null}

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {copy.quoteLabel}
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-1">{quote.title}</h1>
        {quote.quote_reference && (
          <p className="text-sm text-slate-500 mt-1">
            {copy.ref} {quote.quote_reference}
          </p>
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
          <p className="text-lg font-bold text-slate-900">
            {copy.total}: {formatCurrency(quote.total_amount, quote.currency)}
          </p>
        </div>

        {quote.content && (
          <p className="mt-4 text-sm text-slate-600 whitespace-pre-wrap border-t pt-4">
            {quote.content}
          </p>
        )}

        {alreadyResponded ? (
          <div className="mt-8 space-y-4">
            <div className="p-4 rounded-lg bg-slate-50 text-center">
              <p className="font-semibold text-slate-900">
                {isAccepted ? copy.accepted : copy.rejected}
              </p>
            </div>
            {isAccepted && paymentNotice === "success" && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
                {copy.paymentSuccess}
              </p>
            )}
            {isAccepted && paymentNotice === "cancelled" && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
                {copy.paymentCancelled}
              </p>
            )}
            {isAccepted && (
              <PayNowSection
                token={token}
                defaultEmail={quote.response_email ?? email}
                locale={quote.locale}
                paymentsEnabled={quote.payments_enabled}
                paymentReceived={quote.payment_received}
              />
            )}
          </div>
        ) : isExpired ? (
          <div className="mt-8 p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <p className="font-semibold text-amber-900">
              {quote.locale === "es"
                ? "Esta cotización expiró y ya no puede aceptarse."
                : "This quote has expired and can no longer be accepted."}
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                {copy.name}
              </label>
              <input
                className="input-field w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                {copy.email}
              </label>
              <input
                type="email"
                className="input-field w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p>{copy.disclaimer}</p>
              <label className="mt-3 flex items-start gap-2 text-slate-800">
                <input
                  type="checkbox"
                  checked={disclaimerAck}
                  onChange={(e) => setDisclaimerAck(e.target.checked)}
                  className="mt-0.5"
                />
                <span>{copy.disclaimerAck}</span>
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-600">
                {quote.locale === "es" ? "¿Declinar? Cuéntanos por qué (opcional)" : "Declining? Tell us why (optional)"}
              </summary>
              <div className="mt-2 space-y-2">
                <select
                  className="input-field w-full"
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                >
                  <option value="">{quote.locale === "es" ? "Selecciona un motivo" : "Select a reason"}</option>
                  <option value="price">{quote.locale === "es" ? "Precio" : "Price"}</option>
                  <option value="timing">{quote.locale === "es" ? "Timing" : "Timing"}</option>
                  <option value="competitor">{quote.locale === "es" ? "Competidor" : "Competitor"}</option>
                  <option value="other">{quote.locale === "es" ? "Otro" : "Other"}</option>
                </select>
                <textarea
                  className="input-field w-full"
                  rows={2}
                  placeholder={quote.locale === "es" ? "Notas adicionales" : "Additional notes"}
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                />
              </div>
            </details>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                className="flex-1"
                disabled={submitting}
                onClick={() => void respond("accept")}
              >
                {copy.accept}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={submitting}
                onClick={() => void respond("reject")}
              >
                {copy.decline}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
