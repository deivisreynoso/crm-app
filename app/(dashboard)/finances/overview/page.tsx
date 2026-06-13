import { redirect } from "next/navigation";

export default function FinancesOverviewPage() {
  redirect("/dashboard?tab=finances");
}
