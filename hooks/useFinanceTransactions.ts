import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { FinanceTransaction } from "@/types";

export type FinanceTransactionFilters = {
  type?: "income" | "expense";
  status?: string;
  category_id?: string;
  contact_id?: string;
  quote_id?: string;
  invoice_id?: string;
  from?: string;
  to?: string;
};

function buildParams(filters?: FinanceTransactionFilters) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.category_id) params.set("category_id", filters.category_id);
  if (filters?.contact_id) params.set("contact_id", filters.contact_id);
  if (filters?.quote_id) params.set("quote_id", filters.quote_id);
  if (filters?.invoice_id) params.set("invoice_id", filters.invoice_id);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  return params.toString();
}

export function useFinanceTransactions(
  filters?: FinanceTransactionFilters,
  options?: { enabled?: boolean }
) {
  const qs = buildParams(filters);
  return useQuery({
    queryKey: ["finance-transactions", filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data } = await axios.get<{ data: FinanceTransaction[] }>(
        `/api/finances/transactions${qs ? `?${qs}` : ""}`
      );
      return data.data;
    },
  });
}

export function useCreateFinanceTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await axios.post<{ data: FinanceTransaction }>(
        "/api/finances/transactions",
        body
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance-transactions"] });
      void qc.invalidateQueries({ queryKey: ["finance-overview"] });
      void qc.invalidateQueries({ queryKey: ["finance-invoices"] });
    },
  });
}

export function useVoidFinanceTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, void_reason }: { id: string; void_reason: string }) => {
      await axios.post(`/api/finances/transactions/${id}/void`, { void_reason });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance-transactions"] });
      void qc.invalidateQueries({ queryKey: ["finance-overview"] });
      void qc.invalidateQueries({ queryKey: ["finance-invoices"] });
    },
  });
}

/** @deprecated Use useFinanceTransactions */
export { useFinanceTransactions as usePayments };
