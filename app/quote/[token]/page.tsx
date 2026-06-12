import { Suspense } from "react";
import { QuoteAcceptCustomerPage } from "@/components/quotes/quote-accept-customer-page";

type Props = { params: Promise<{ token: string }> };

export default async function PublicQuoteAcceptPage({ params }: Props) {
  const { token } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-slate-600">Loading quote…</p>
        </div>
      }
    >
      <QuoteAcceptCustomerPage token={token} />
    </Suspense>
  );
}
