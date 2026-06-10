import { redirect } from "next/navigation";

/** Product catalog moved to Quotes → Products tab. */
export default function ServicesRedirectPage() {
  redirect("/quotes?tab=products");
}
