import { QuoteAcceptCustomerPage } from "@/components/quotes/quote-accept-customer-page";

type Props = { params: Promise<{ token: string }> };

export default async function PublicQuoteAcceptPage({ params }: Props) {
  const { token } = await params;
  return <QuoteAcceptCustomerPage token={token} />;
}
