import { redirect } from "next/navigation";

export default function DocumentsNewRedirectPage() {
  redirect("/quotes/new");
}
