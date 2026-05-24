import { redirect } from "next/navigation";

/** Spanish-first marketing site; use header language toggle for English. */
export default function RootPage() {
  redirect("/es");
}
