import { redirect } from "next/navigation";

export default function FinancesOverviewPage() {
  redirect("/analytics?tab=finances");
}
