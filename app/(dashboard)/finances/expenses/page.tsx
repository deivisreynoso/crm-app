import { redirect } from "next/navigation";

export default function FinancesExpensesPage() {
  redirect("/finances/transactions?type=expense");
}
