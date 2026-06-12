import type { FinanceTransaction } from "@/types";
import { useFinanceTransactions } from "@/hooks/useFinanceTransactions";

/** @deprecated Legacy alias — use FinanceTransaction / useFinanceTransactions */
export type PaymentRecord = FinanceTransaction;

/** @deprecated Use useFinanceTransactions — reads finance_transactions ledger */
export function usePayments() {
  const q = useFinanceTransactions();
  return {
    ...q,
    data: q.data?.filter((t) => t.type === "income") ?? [],
  };
}
