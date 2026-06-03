import { redirect } from "next/navigation";

/** Accounts object removed — company lives on the contact record. */
export default function AccountsRedirectPage() {
  redirect("/contacts");
}
