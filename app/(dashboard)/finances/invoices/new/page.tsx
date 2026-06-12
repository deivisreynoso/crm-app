import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ quote_id?: string; contact_id?: string }>;
};

export default async function NewInvoiceRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const params = new URLSearchParams({ create: "1" });
  if (sp.quote_id) params.set("quote_id", sp.quote_id);
  if (sp.contact_id) params.set("contact_id", sp.contact_id);
  redirect(`/finances/invoices?${params.toString()}`);
}
