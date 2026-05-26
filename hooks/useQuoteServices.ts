"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { QuoteService } from "@/types";

export function useQuoteServices() {
  return useQuery({
    queryKey: ["quote-services"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: QuoteService[] }>("/api/quote-services");
      return data.data ?? [];
    },
  });
}

export function useCreateQuoteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      unit_price: number;
      currency?: string;
    }) => axios.post<QuoteService>("/api/quote-services", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-services"] }),
  });
}

export function useUpdateQuoteService(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<QuoteService>) =>
      axios.patch<QuoteService>(`/api/quote-services/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-services"] }),
  });
}

export function useDeleteQuoteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/quote-services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-services"] }),
  });
}
