import { redirect } from "next/navigation";

/** Legacy account URLs redirect to contacts filtered by company. */
export default async function AccountDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/contacts?company_id=${encodeURIComponent(id)}`);
}
