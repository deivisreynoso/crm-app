import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { SavedFilterFormData } from "@/lib/validators";

export interface SavedFilter {
  id: string;
  name: string;
  entity_type: string;
  filter_config: Record<string, unknown>;
}

export function useSavedFilters(entityType: string) {
  return useQuery({
    queryKey: ["saved-filters", entityType],
    queryFn: async () => {
      const { data } = await axios.get<{ data: SavedFilter[] }>(
        "/api/saved-filters",
        { params: { entity_type: entityType } }
      );
      return data.data;
    },
  });
}

export function useCreateSavedFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SavedFilterFormData) =>
      axios.post<SavedFilter>("/api/saved-filters", input),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["saved-filters", vars.entity_type],
      });
    },
  });
}

export function useDeleteSavedFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entityType }: { id: string; entityType: string }) =>
      axios.delete(`/api/saved-filters/${id}`),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["saved-filters", vars.entityType],
      });
    },
  });
}
