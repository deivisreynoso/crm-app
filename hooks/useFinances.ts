import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  FinanceCategory,
  FinanceOverview,
  FinanceSettings,
  Invoice,
  PaymentLink,
} from "@/types";

export function useFinanceOverview(period = "month", from?: string, to?: string) {
  const params = new URLSearchParams({ period });
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  return useQuery({
    queryKey: ["finance-overview", period, from, to],
    queryFn: async () => {
      const { data } = await axios.get<{ data: FinanceOverview }>(
        `/api/finances/overview?${params}`
      );
      return data.data;
    },
  });
}

export type InvoiceListFilters = {
  status?: string;
  contact_id?: string;
  quote_id?: string;
  summary?: boolean;
};

export function useInvoices(filters?: InvoiceListFilters | string) {
  const resolved: InvoiceListFilters =
    typeof filters === "string" ? { status: filters } : (filters ?? {});

  return useQuery({
    queryKey: ["finance-invoices", resolved],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (resolved.status) params.set("status", resolved.status);
      if (resolved.contact_id) params.set("contact_id", resolved.contact_id);
      if (resolved.quote_id) params.set("quote_id", resolved.quote_id);
      if (resolved.summary) params.set("summary", "1");
      const qs = params.toString();
      const { data } = await axios.get<{ data: Invoice[] }>(
        `/api/finances/invoices${qs ? `?${qs}` : ""}`
      );
      return data.data;
    },
  });
}

export type PaymentLinkFilters = {
  status?: string;
  invoice_id?: string;
};

export function usePaymentLinks(
  filters?: PaymentLinkFilters | string,
  options?: { enabled?: boolean }
) {
  const resolved: PaymentLinkFilters =
    typeof filters === "string" ? { status: filters } : (filters ?? {});

  return useQuery({
    queryKey: ["finance-payment-links", resolved],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (resolved.status) params.set("status", resolved.status);
      if (resolved.invoice_id) params.set("invoice_id", resolved.invoice_id);
      const qs = params.toString();
      const { data } = await axios.get<{ data: PaymentLink[] }>(
        `/api/finances/payment-links${qs ? `?${qs}` : ""}`
      );
      return data.data;
    },
  });
}

export function useFinanceCategories() {
  return useQuery({
    queryKey: ["finance-categories"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: FinanceCategory[] }>(
        "/api/finances/categories"
      );
      return data.data;
    },
  });
}

export function useFinanceSettings() {
  return useQuery({
    queryKey: ["finance-settings"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: FinanceSettings }>("/api/settings/finances");
      return data.data;
    },
  });
}

export function useUpdateFinanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<FinanceSettings>) => {
      const { data } = await axios.patch<{ data: FinanceSettings }>(
        "/api/settings/finances",
        patch
      );
      return data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["finance-settings"] }),
  });
}

export function useCreatePaymentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await axios.post<{ data: PaymentLink }>(
        "/api/finances/payment-links",
        body
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance-payment-links"] });
      void qc.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });
}

export type InvoiceWizardPayload = {
  invoice_type: string;
  quote_id?: string | null;
  contact_id: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount?: number;
  total: number;
  currency: "USD" | "MXN";
  due_date?: string | null;
  notes?: string | null;
  footer_text?: string | null;
  collection_method: "manual" | "payment_link";
};

export function useCreateInvoiceWizard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: InvoiceWizardPayload) => {
      const { data } = await axios.post<{
        data: {
          invoice: Invoice;
          payment_link_url?: string | null;
          email_sent?: boolean;
          email_error?: string;
        };
      }>("/api/finances/invoices/wizard", body);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      void qc.invalidateQueries({ queryKey: ["finance-payment-links"] });
    },
  });
}

export function useInvoice(invoiceId: string | null) {
  return useQuery({
    queryKey: ["finance-invoice", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data } = await axios.get<{ data: Invoice }>(
        `/api/finances/invoices/${invoiceId}`
      );
      return data.data;
    },
  });
}

export function useUpdateInvoice(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { data } = await axios.patch<{ data: Invoice }>(
        `/api/finances/invoices/${invoiceId}`,
        patch
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance-invoice", invoiceId] });
      void qc.invalidateQueries({ queryKey: ["finance-invoices"] });
    },
  });
}

export function useDuplicateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data } = await axios.post<{ data: Invoice }>(
        `/api/finances/invoices/${invoiceId}/duplicate`
      );
      return data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["finance-invoices"] }),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      await axios.delete(`/api/finances/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      void qc.invalidateQueries({ queryKey: ["finance-overview"] });
      void qc.invalidateQueries({ queryKey: ["finance-payment-links"] });
      void qc.invalidateQueries({ queryKey: ["finance-transactions"] });
    },
  });
}

export function useBulkDeleteInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await axios.post<{ deleted: string[]; failed: Array<{ id: string; error: string }> }>(
        "/api/finances/invoices/bulk-delete",
        { ids }
      );
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance-invoices"] });
      void qc.invalidateQueries({ queryKey: ["finance-overview"] });
      void qc.invalidateQueries({ queryKey: ["finance-payment-links"] });
      void qc.invalidateQueries({ queryKey: ["finance-transactions"] });
    },
  });
}
