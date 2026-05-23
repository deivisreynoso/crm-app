import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Company, CompanyRelated } from "@/types";

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Company[] }>("/api/companies");
      return data.data;
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data } = await axios.get<Company>(`/api/companies/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCompanyRelated(id: string) {
  return useQuery({
    queryKey: ["company-related", id],
    queryFn: async () => {
      const { data } = await axios.get<CompanyRelated>(
        `/api/companies/${id}/related`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; website?: string; phone?: string; industry?: string }) =>
      axios.post<Company>("/api/companies", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Company>) =>
      axios.patch<Company>(`/api/companies/${id}`, input),
    onSuccess: (res) => {
      queryClient.setQueryData(["company", id], res.data);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company-related", id] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
