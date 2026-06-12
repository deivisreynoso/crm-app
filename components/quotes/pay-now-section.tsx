"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuoteAcceptCopy } from "@/lib/quotes/public-accept-copy";

type PayNowSectionProps = {
  token: string;
  defaultEmail?: string;
  locale?: "en" | "es";
  paymentsEnabled?: boolean;
  paymentReceived?: boolean;
};

export function PayNowSection({
  token,
  defaultEmail = "",
  locale = "en",
  paymentsEnabled = true,
  paymentReceived = false,
}: PayNowSectionProps) {
  const copy = getQuoteAcceptCopy(locale);
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(defaultEmail);
  }, [defaultEmail]);

  if (!paymentsEnabled || paymentReceived) {
    if (paymentReceived) {
      return (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
          {copy.paymentReceived}
        </p>
      );
    }
    return null;
  }

  async function handlePay() {
    if (!email.trim()) {
      setError(copy.emailRequired);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post<{ url?: string; error?: string }>(
        `/api/quotes/public/${encodeURIComponent(token)}/checkout`,
        { email: email.trim() }
      );
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(copy.paymentError);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : copy.paymentError;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center gap-2 justify-center">
        <CreditCard className="h-4 w-4 text-slate-600" />
        <p className="text-sm font-semibold text-slate-900">{copy.payNowTitle}</p>
      </div>
      <p className="text-xs text-slate-600 text-center">{copy.payNowHint}</p>
      <div>
        <label className="text-xs font-medium text-slate-700 block mb-1">{copy.email}</label>
        <input
          type="email"
          className="input-field w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" className="w-full" disabled={loading} onClick={() => void handlePay()}>
        {loading ? copy.payNowLoading : copy.payNowCta}
      </Button>
    </div>
  );
}
