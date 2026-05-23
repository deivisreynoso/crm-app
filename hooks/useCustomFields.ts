import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { CustomFieldDefinition } from "@/types";
import type { CustomFieldFormData } from "@/lib/validators";

export function useCustomFields(entityType?: string) {
  return useQuery({
    queryKey: ["custom-fields", entityType],
    queryFn: async () => {
      const { data } = await axios.get<{ data: CustomFieldDefinition[] }>(
        "/api/custom-fields",
        { params: entityType ? { entity_type: entityType } : {} }
      );
      return data.data;
    },
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomFieldFormData) =>
      axios.post<CustomFieldDefinition>("/api/custom-fields", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
    },
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CustomFieldFormData>;
    }) => axios.patch<CustomFieldDefinition>(`/api/custom-fields/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
    },
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/api/custom-fields/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
    },
  });
}
